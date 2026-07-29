using System;
using System.Collections.Generic;

namespace CustomerManager.Core.Models;

public enum InterestRateType
{
    Preferential = 0, // Lãi suất ưu đãi
    Floating = 1,     // Lãi suất thả nổi = Base + Margin
    Fixed = 2         // Lãi suất thông thường / Cố định
}

public class Loan
{
    public int Id { get; set; }
    public string LoanNumber { get; set; } = ""; // Mã Giấy Nhận Nợ (GNN)

    public decimal Amount { get; set; } // Số tiền nhận nợ (VNĐ)
    public decimal CurrentOutstandingBalance { get; set; } // Dư nợ hiện hữu (VNĐ)

    // ===== LÃI SUẤT =====
    public InterestRateType RateType { get; set; } = InterestRateType.Preferential;
    public double PreferentialRate { get; set; } = 7.5; // Lãi suất ưu đãi (%/năm)
    public int PreferentialMonths { get; set; } = 12;   // Số tháng ưu đãi
    public double BaseInterestRate { get; set; } = 6.5; // Lãi suất cơ sở (%/năm)
    public double MarginRate { get; set; } = 2.0;       // Biên độ (%/năm)
    public double InterestRate { get; set; } = 8.5;     // Lãi suất áp dụng hiện tại (%/năm)

    // ===== THỜI HẠN & NGÀY THÁNG =====
    public int TermMonths { get; set; } = 12;           // Thời hạn GNN (3, 5, 6, 9, 12... tháng)
    public int GracePeriodMonths { get; set; } = 0;     // Ân hạn gốc (0, 6, 12, 18, 24, 36 tháng)
    public int RepaymentDayOfMonth { get; set; } = 15;  // Ngày trả nợ hàng tháng (1 - 31)
    public DateTime? DisbursementDate { get; set; }     // Ngày giải ngân (GN)
    public string RepaymentMethod { get; set; } = "Gốc trả cuối kỳ, Lãi trả hàng tháng theo dư nợ thực tế";
    public string Purpose { get; set; } = "Vay sản xuất kinh doanh / tiêu dùng";

    public string? Status { get; set; } = "Chờ giải ngân"; // Chờ giải ngân, Đã giải ngân, Tất toán
    public int DaysPastDue { get; set; } = 0;
    public int? DebtGroup { get; set; } = 1;

    public int? CollateralId { get; set; }
    public Collateral? Collateral { get; set; }

    public double RealizedLtvRate { get; set; }

    public int LoanContractId { get; set; }
    public LoanContract? LoanContract { get; set; }

    public List<LoanSchedule> LoanSchedules { get; set; } = new();

    // ===== THUỘC TÍNH TÍNH TOÁN =====
    public DateTime? KunnDueDate => DisbursementDate?.AddMonths(TermMonths); // Hạn KUNN = Ngày GN + Thời hạn GNN
    public DateTime? RateChangeDate => DisbursementDate?.AddMonths(PreferentialMonths); // Ngày thay đổi LS

    public string CustomerName => LoanContract?.Customer?.FullName ?? "N/A";
    public string CustomerCif => LoanContract?.Customer?.CifKh ?? "N/A";

    public string DisplaySummary => $"{LoanNumber} - {Amount:N0} VNĐ ({Status ?? "Chờ giải ngân"})";

    public string DebtGroupDisplay => DebtGroup switch
    {
        1 => "Nhóm 1 (Đủ tiêu chuẩn)",
        2 => "Nhóm 2 (Cần chú ý)",
        3 => "Nhóm 3 (Dưới tiêu chuẩn)",
        4 => "Nhóm 4 (Nghi ngờ)",
        5 => "Nhóm 5 (Mất vốn)",
        _ => $"Nhóm {DebtGroup}"
    };
}