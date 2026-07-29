using System;
using System.Linq;
using System.Threading.Tasks;
using CustomerManager.Core.Models;
using CustomerManager.Data;
using Microsoft.EntityFrameworkCore;

namespace CustomerManager.Services;

public class CreditAssessmentService : ICreditAssessmentService
{
    public async Task<(bool IsSafe, double CurrentLtvPercent, decimal MaxAllowableLoan)> CalculateLtvSafetyAsync(int loanContractId, decimal requestedLoanAmount)
    {
        using var db = new AppDbContext();
        var contract = await db.LoanContracts
            .Include(lc => lc.Collateral)
            .Include(lc => lc.LoanCollaterals)
                .ThenInclude(lc => lc.Collateral)
            .FirstOrDefaultAsync(lc => lc.Id == loanContractId);

        if (contract == null) return (false, 0, 0);

        decimal totalAppraisedValue = 0;
        decimal maxAllowableLoan = 0;

        if (contract.Collateral != null)
        {
            totalAppraisedValue += contract.Collateral.AppraisedValue;
            maxAllowableLoan += contract.Collateral.MaxAllowableLoanAmount;
        }

        foreach (var lc in contract.LoanCollaterals)
        {
            if (lc.Collateral != null)
            {
                totalAppraisedValue += lc.Collateral.AppraisedValue;
                maxAllowableLoan += lc.Collateral.MaxAllowableLoanAmount;
            }
        }

        if (totalAppraisedValue == 0)
        {
            return (false, 100.0, 0);
        }

        double currentLtvPercent = (double)(requestedLoanAmount / totalAppraisedValue) * 100.0;
        bool isSafe = requestedLoanAmount <= maxAllowableLoan;

        return (isSafe, Math.Round(currentLtvPercent, 2), Math.Round(maxAllowableLoan, 0));
    }

    public async Task<(bool CanDisburse, string Reason)> ValidateDisbursementConditionsAsync(int loanContractId, decimal loanAmount)
    {
        using var db = new AppDbContext();

        var contract = await db.LoanContracts
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.ApprovalCondition)
            .FirstOrDefaultAsync(c => c.Id == loanContractId);

        if (contract == null) return (false, "Không tìm thấy hợp đồng tín dụng.");

        // 1. Kiểm tra Điều kiện Phê duyệt Tiền giải ngân
        if (contract.Customer?.ApprovalCondition != null && !contract.Customer.ApprovalCondition.IsFulfilled)
        {
            return (false, $"Điều kiện phê duyệt chưa hoàn thành: '{contract.Customer.ApprovalCondition.ConditionText}'");
        }

        // 2. Kiểm tra Tỷ lệ LTV TSĐB
        var ltvCheck = await CalculateLtvSafetyAsync(loanContractId, loanAmount);
        if (!ltvCheck.IsSafe)
        {
            return (false, $"Tiền vay ({loanAmount:N0} VNĐ) vượt quá mức cấp tín dụng an toàn theo LTV tối đa ({ltvCheck.MaxAllowableLoan:N0} VNĐ).");
        }

        return (true, "Đủ điều kiện giải ngân.");
    }
}
