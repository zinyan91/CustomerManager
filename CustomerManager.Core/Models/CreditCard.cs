using System;

namespace CustomerManager.Core.Models
{
    public enum CardIssuanceType
    {
        SavingsPledge = 0,     // Cầm cố Sổ tiết kiệm / Giấy tờ có giá
        CreditRelation = 1,    // KH đang có Quan hệ tín dụng (Thế chấp TSĐB)
        SalaryUnsecured = 2,   // Tín chấp theo Lương
        EmployeeUnsecured = 3  // Tín chấp CBNV / Khác
    }

    public class CreditCard
    {
        public int Id { get; set; }

        public string CardNumber { get; set; } = ""; // Số thẻ tín dụng (Masked hoặc định danh)
        public string CardType { get; set; } = "VISA Platinum"; // VISA Gold, Mastercard Platinum, JCB...

        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public decimal CreditLimit { get; set; } // Hạn mức cấp thẻ (VNĐ)
        public decimal CurrentBalance { get; set; } = 0m; // Dư nợ thẻ hiện tại

        public CardIssuanceType IssuanceType { get; set; } = CardIssuanceType.CreditRelation;

        public int? CollateralId { get; set; }
        public Collateral? Collateral { get; set; }

        public double InterestRate { get; set; } = 18.0; // Lãi suất thẻ %/năm
        public DateTime IssueDate { get; set; } = DateTime.Today;
        public DateTime ExpiryDate { get; set; } = DateTime.Today.AddYears(3);

        public string Status { get; set; } = "Hoạt động"; // Hoạt động, Tạm khóa, Tất toán

        public string CustomerName => Customer?.FullName ?? "N/A";
        public string CustomerCif => Customer?.CifKh ?? "N/A";
        public string CollateralSummary => Collateral?.DisplaySummary ?? (IssuanceType == CardIssuanceType.CreditRelation ? "Chưa gán TSĐB" : "Không có TSĐB");

        public string IssuanceTypeDisplay => IssuanceType switch
        {
            CardIssuanceType.SavingsPledge => "1. Cầm cố STK / GTGG",
            CardIssuanceType.CreditRelation => "2. Thế chấp TSĐB (QH Tín dụng)",
            CardIssuanceType.SalaryUnsecured => "3. Tín chấp theo Lương",
            CardIssuanceType.EmployeeUnsecured => "4. Tín chấp CBNV / Khác",
            _ => "Khác"
        };
    }
}
