using System.Threading.Tasks;
using CustomerManager.Core.Models;

namespace CustomerManager.Services;

public interface ICreditAssessmentService
{
    Task<(bool IsSafe, double CurrentLtvPercent, decimal MaxAllowableLoan)> CalculateLtvSafetyAsync(int loanContractId, decimal requestedLoanAmount);
    Task<(bool CanDisburse, string Reason)> ValidateDisbursementConditionsAsync(int loanContractId, decimal loanAmount);
}
