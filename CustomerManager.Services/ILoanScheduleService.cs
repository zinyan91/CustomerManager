using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CustomerManager.Core.Models;

namespace CustomerManager.Services;

public interface ILoanScheduleService
{
    List<LoanSchedule> GenerateAmortizationSchedule(Loan loan, DateTime startDate);
    int CalculateDebtGroup(int daysPastDue);
    Task<bool> RecordPaymentAsync(int scheduleId, decimal paidAmount);
    Task<bool> RecordPrepaymentAsync(int loanId, decimal prepaymentAmount);
}
