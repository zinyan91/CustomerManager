using System;
using System.Collections.Generic;

namespace CustomerManager.Core.Models
{
    public class Customer
    {
        public int Id { get; set; }

        public string CifKh { get; set; } = "";
        public string? CifKhlq { get; set; }

        public string FullName { get; set; } = "";
        public string? NationalId { get; set; }
        public DateTime? IdCardIssueDate { get; set; }
        public string? IdCardIssuePlace { get; set; }

        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? PermanentAddress { get; set; }
        public string? CurrentAddress { get; set; }

        // Tình trạng hôn nhân & Thân nhân
        public string MaritalStatus { get; set; } = "Độc thân"; // Độc thân, Đã kết hôn, Ly hôn, Góa
        public string? SpouseName { get; set; }
        public string? SpouseNationalId { get; set; }
        public string? SpousePhone { get; set; }
        public decimal SpouseIncome { get; set; }

        // Tài chính & Tín dụng
        public int CustomerType { get; set; } = 0; // 0: Cá nhân, 1: Doanh nghiệp
        public decimal MonthlyIncome { get; set; } // Thu nhập cá nhân hàng tháng
        public int CreditScore { get; set; } = 600; // Điểm tín dụng (300-850)
        public string CreditRating { get; set; } = "A"; // AAA, AA, A, B, C
        public string CicStatus { get; set; } = "Nợ tốt"; // Nợ tốt, Nợ chú ý, Nợ xấu

        public string? AccountNumber { get; set; }
        public string? SpouseAccountNumber { get; set; }

        public List<Collateral> Collaterals { get; set; } = new();
        public List<LoanContract> LoanContracts { get; set; } = new();

        public CreditCard? CreditCard { get; set; }
        public ApprovalCondition? ApprovalCondition { get; set; }
        public PostLoanControl? PostLoanControl { get; set; }

        public string SpouseCifDisplay => !string.IsNullOrWhiteSpace(CifKhlq) ? CifKhlq : "-";
        public string SpouseNameDisplay => MaritalStatus == "Đã kết hôn" ? (string.IsNullOrWhiteSpace(SpouseName) ? "Chưa khai báo" : SpouseName) : "-";

        public override string ToString()
        {
            if (string.IsNullOrWhiteSpace(CifKh)) return FullName;
            return $"{FullName} ({CifKh})";
        }
    }
}