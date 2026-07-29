using System;
using System.Collections.Generic;

namespace CustomerManager.Core.Models;

public enum LoanContractType
{
    HMTD = 0,     // Hạn mức tín dụng (Revolving Facility)
    TermLoan = 1  // Cho vay từng lần (Term Loan)
}

public class LoanContract
{
    public int Id { get; set; }
    public string ContractNumber { get; set; } = "";

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public LoanContractType ContractType { get; set; } = LoanContractType.HMTD;

    public decimal ContractAmount { get; set; } // Tổng hạn mức cấp (VNĐ)

    public DateTime? HdtdDueDate { get; set; }  // Hạn HĐTD

    public string? LoanPurpose { get; set; } = "Vay sản xuất kinh doanh / tiêu dùng";
    public string? Note { get; set; }

    public int? CollateralId { get; set; }
    public Collateral? Collateral { get; set; }

    public List<Loan> Drawdowns { get; set; } = new();
    public List<LoanCollateral> LoanCollaterals { get; set; } = new();

    public bool IsSettled { get; set; }
    public bool IsRestructured { get; set; }
    public int? DebtGroup { get; set; } = 1;

    public string ContractTypeDisplay => ContractType == LoanContractType.HMTD ? "Hạn Mức Tín Dụng" : "Cho Vay Từng Lần";
    public bool IsHmtd => ContractType == LoanContractType.HMTD;
    public string CustomerName => Customer?.FullName ?? "N/A";
    public string CustomerCif => Customer?.CifKh ?? "N/A";

    public decimal TotalDrawdownAmount => Drawdowns?.Where(d => d.Status == "Đã giải ngân").Sum(d => d.Amount) ?? 0m;
    public decimal TotalCurrentBalance => Drawdowns?.Where(d => d.Status == "Đã giải ngân").Sum(d => d.CurrentOutstandingBalance) ?? 0m;
    public decimal AvailableCreditLimit => Math.Max(0m, ContractAmount - TotalCurrentBalance);
}
