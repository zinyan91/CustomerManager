using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CustomerManager.Core.Models;
using CustomerManager.Data;
using Microsoft.EntityFrameworkCore;

namespace CustomerManager.Services;

public class LoanScheduleService : ILoanScheduleService
{
    public List<LoanSchedule> GenerateAmortizationSchedule(Loan loan, DateTime startDate)
    {
        var schedules = new List<LoanSchedule>();
        if (loan == null || loan.TermMonths <= 0 || loan.Amount <= 0) return schedules;

        decimal amount = loan.Amount;
        int totalMonths = loan.TermMonths;
        int graceMonths = Math.Min(loan.GracePeriodMonths, totalMonths - 1);
        int repaymentDay = loan.RepaymentDayOfMonth > 0 ? loan.RepaymentDayOfMonth : 15;
        decimal remainingBalance = amount;

        // Xử lý phương thức trả nợ: HMTD (Gốc trả cuối kỳ) vs TermLoan (Gốc trả đều sau ân hạn)
        bool isBulletPrincipal = loan.LoanContract?.ContractType == LoanContractType.HMTD ||
                                 loan.RepaymentMethod.Contains("cuối kỳ", StringComparison.OrdinalIgnoreCase);

        int principalPaymentMonths = isBulletPrincipal ? 1 : (totalMonths - graceMonths);
        decimal monthlyPrincipal = isBulletPrincipal ? 0m : Math.Round(amount / Math.Max(1, principalPaymentMonths), 2);

        // Xác định tháng bắt đầu trả kỳ 1:
        // Nếu Ngày giải ngân (vd 5/5) <= Ngày trả nợ hàng tháng (15) -> Kỳ 1 trả vào 15/5 (cùng tháng)
        // Nếu Ngày giải ngân (vd 20/5) > Ngày trả nợ hàng tháng (15) -> Kỳ 1 trả vào 15/6 (tháng sau)
        bool sameMonthFirstPayment = startDate.Day <= repaymentDay;

        for (int i = 1; i <= totalMonths; i++)
        {
            int monthOffset = sameMonthFirstPayment ? (i - 1) : i;
            DateTime baseMonth = startDate.AddMonths(monthOffset);
            int maxDaysInMonth = DateTime.DaysInMonth(baseMonth.Year, baseMonth.Month);
            DateTime dueDate = new DateTime(baseMonth.Year, baseMonth.Month, Math.Min(repaymentDay, maxDaysInMonth));

            // Lãi suất áp dụng từng kỳ (Ưu đãi -> Sau đó thả nổi = Lãi ưu đãi + Biên độ)
            double appliedRate = loan.InterestRate;
            if (loan.RateType == InterestRateType.Preferential)
            {
                if (i <= loan.PreferentialMonths)
                {
                    appliedRate = loan.PreferentialRate;
                }
                else
                {
                    appliedRate = loan.PreferentialRate + loan.MarginRate;
                }
            }

            double monthlyRate = (appliedRate / 100.0) / 12.0;
            decimal interestForMonth = Math.Round(remainingBalance * (decimal)monthlyRate, 2);

            decimal principalForMonth = 0m;
            if (isBulletPrincipal)
            {
                principalForMonth = (i == totalMonths) ? remainingBalance : 0m;
            }
            else
            {
                if (i <= graceMonths)
                {
                    principalForMonth = 0m; // Ân hạn gốc: Tiền gốc = 0 VNĐ
                }
                else if (i == totalMonths)
                {
                    principalForMonth = remainingBalance; // Kỳ cuối thanh toán phần gốc còn lại
                }
                else
                {
                    principalForMonth = Math.Min(remainingBalance, monthlyPrincipal);
                }
            }

            remainingBalance -= principalForMonth;

            schedules.Add(new LoanSchedule
            {
                PeriodNumber = i,
                DueDate = dueDate,
                PrincipalAmount = principalForMonth,
                InterestAmount = interestForMonth,
                RemainingBalance = Math.Max(0m, remainingBalance),
                PaidPrincipal = 0m,
                PaidInterest = 0m,
                IsPaid = false
            });
        }

        return schedules;
    }

    public int CalculateDebtGroup(int daysPastDue)
    {
        return daysPastDue switch
        {
            <= 9 => 1,
            <= 90 => 2,
            <= 180 => 3,
            <= 360 => 4,
            _ => 5
        };
    }

    public async Task<bool> RecordPaymentAsync(int scheduleId, decimal paidAmount)
    {
        using var db = new AppDbContext();
        var schedule = await db.LoanSchedules.Include(s => s.Loan).FirstOrDefaultAsync(s => s.Id == scheduleId);
        if (schedule == null || paidAmount <= 0) return false;

        decimal totalDue = schedule.TotalAmount - (schedule.PaidPrincipal + schedule.PaidInterest);
        decimal payment = Math.Min(paidAmount, totalDue);

        decimal remainingForInterest = schedule.InterestAmount - schedule.PaidInterest;
        if (remainingForInterest > 0)
        {
            decimal payInterest = Math.Min(payment, remainingForInterest);
            schedule.PaidInterest += payInterest;
            payment -= payInterest;
        }

        if (payment > 0)
        {
            schedule.PaidPrincipal += payment;
            if (schedule.Loan != null)
            {
                schedule.Loan.CurrentOutstandingBalance = Math.Max(0m, schedule.Loan.CurrentOutstandingBalance - payment);
            }
        }

        if (schedule.PaidPrincipal >= schedule.PrincipalAmount && schedule.PaidInterest >= schedule.InterestAmount)
        {
            schedule.IsPaid = true;
            schedule.PaymentDate = DateTime.Now;
        }

        await db.SaveChangesAsync();

        if (schedule.Loan != null)
        {
            var hasUnpaidOverdue = await db.LoanSchedules
                .AnyAsync(s => s.LoanId == schedule.LoanId && !s.IsPaid && s.DueDate < DateTime.Now);

            if (!hasUnpaidOverdue)
            {
                schedule.Loan.DaysPastDue = 0;
                schedule.Loan.DebtGroup = 1;
                await db.SaveChangesAsync();
            }
        }

        return true;
    }

    public async Task<bool> RecordPrepaymentAsync(int loanId, decimal prepaymentAmount)
    {
        if (prepaymentAmount <= 0) return false;

        using var db = new AppDbContext();
        var loan = await db.Loans.Include(l => l.LoanSchedules).FirstOrDefaultAsync(l => l.Id == loanId);
        if (loan == null || loan.CurrentOutstandingBalance <= 0) return false;

        decimal actualPrepay = Math.Min(prepaymentAmount, loan.CurrentOutstandingBalance);
        loan.CurrentOutstandingBalance -= actualPrepay;

        if (loan.CurrentOutstandingBalance == 0)
        {
            loan.Status = "Tất toán";
            foreach (var s in loan.LoanSchedules.Where(s => !s.IsPaid))
            {
                s.IsPaid = true;
                s.PaymentDate = DateTime.Now;
            }
        }

        await db.SaveChangesAsync();
        return true;
    }
}
