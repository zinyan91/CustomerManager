using System;

namespace CustomerManager.Core.Models;

public class LoanSchedule
{
    public int Id { get; set; }

    public int LoanId { get; set; }
    public Loan Loan { get; set; } = null!;

    public int PeriodNumber { get; set; }
    public DateTime DueDate { get; set; }

    public decimal PrincipalAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal TotalAmount => PrincipalAmount + InterestAmount;

    public decimal RemainingBalance { get; set; }

    public decimal PaidPrincipal { get; set; }
    public decimal PaidInterest { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaymentDate { get; set; }
}
