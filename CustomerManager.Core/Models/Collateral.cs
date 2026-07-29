using System;
using System.Collections.Generic;

namespace CustomerManager.Core.Models
{
    public class Collateral
    {
        public int Id { get; set; }

        public string AssetCode { get; set; } = ""; // Mã TS chứng thư do Banker nhập

        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public string Address { get; set; } = "";

        public decimal AppraisedValue { get; set; }
        public decimal Value { get; set; }

        public string AssetType { get; set; } = "Loại 1: BĐS Nhà ở (LTV 80%)";

        public double LtvPercent { get; set; }

        public double LtvMaxRate { get; set; } = 0.80;

        public DateTime? AppraisalDate { get; set; } = DateTime.Now;
        public int? AppraisalValidMonths { get; set; } = 12;

        public string? Note { get; set; }

        public List<LoanCollateral> LoanCollaterals { get; set; } = new();

        public string AssetCodeDisplay => string.IsNullOrWhiteSpace(AssetCode) ? $"TS-{Id:D4}" : AssetCode;
        public string DisplaySummary => $"{AssetCodeDisplay} - {AppraisedValue:N0} VNĐ ({AssetTypeDisplay})";

        public double EffectiveMaxLtvRate
        {
            get
            {
                if (LtvMaxRate > 0) return LtvMaxRate;
                if (string.IsNullOrEmpty(AssetType)) return 0.80;
                if (AssetType.Contains("Loại 1")) return 0.80;
                if (AssetType.Contains("Loại 2")) return 0.70;
                if (AssetType.Contains("Loại 3")) return 0.60;
                if (AssetType.Contains("Loại 4")) return 0.55;
                if (AssetType.Contains("Hạn chế")) return 0.40;
                return 0.70;
            }
        }

        public decimal MaxAllowableLoanAmount => Math.Round(AppraisedValue * (decimal)EffectiveMaxLtvRate, 0);

        public string AssetTypeDisplay
        {
            get
            {
                if (string.IsNullOrEmpty(AssetType)) return "Loại 1";
                if (AssetType.Contains("Loại 1")) return "Loại 1";
                if (AssetType.Contains("Loại 2")) return "Loại 2";
                if (AssetType.Contains("Loại 3")) return "Loại 3";
                if (AssetType.Contains("Loại 4")) return "Loại 4";
                if (AssetType.Contains("Hạn chế")) return "Hạn chế";
                if (AssetType.Contains("Phương tiện")) return "Phương tiện";
                if (AssetType.Contains("Sổ tiết kiệm")) return "GT có giá";
                return AssetType;
            }
        }

        public DateTime ExpiryDate
        {
            get
            {
                var baseDate = AppraisalDate ?? DateTime.Now;
                int months = AppraisalValidMonths ?? 12;
                return baseDate.AddMonths(months);
            }
        }

        public int RemainingDays
        {
            get
            {
                return (int)(ExpiryDate.Date - DateTime.Today).TotalDays;
            }
        }

        public string RemainingDaysDisplay
        {
            get
            {
                int days = RemainingDays;
                if (days <= 0) return "Cần định giá lại tài sản";
                return $"Còn {days} ngày";
            }
        }

        public bool IsExpiredDays => RemainingDays <= 0;
        public bool IsWarningDays => RemainingDays > 0 && RemainingDays <= 30;
        public bool IsSuccessDays => RemainingDays > 30;

        public double CalculateActualLtv(IEnumerable<LoanContract>? contracts, IEnumerable<Loan>? loans, IEnumerable<CreditCard>? cards = null)
        {
            if (AppraisedValue <= 0) return 0;

            decimal totalObligation = 0m;

            // 1. Tính tổng nghĩa vụ từ các Hợp đồng tín dụng / GNN
            if (contracts != null)
            {
                var customerContracts = contracts.Where(c => c.CollateralId == Id || c.CustomerId == CustomerId);
                foreach (var c in customerContracts)
                {
                    if (c.ContractType == LoanContractType.HMTD)
                    {
                        totalObligation += c.ContractAmount;
                    }
                    else // Cho Vay Từng Lần
                    {
                        if (c.Drawdowns != null && c.Drawdowns.Any(d => d.Status == "Đã giải ngân"))
                        {
                            totalObligation += c.Drawdowns.Where(d => d.Status == "Đã giải ngân").Sum(d => d.CurrentOutstandingBalance);
                        }
                        else
                        {
                            totalObligation += c.ContractAmount;
                        }
                    }
                }
            }

            if (totalObligation <= 0 && loans != null)
            {
                var customerLoans = loans.Where(l => l.CollateralId == Id || (l.LoanContract != null && (l.LoanContract.CollateralId == Id || l.LoanContract.CustomerId == CustomerId)));
                totalObligation = customerLoans.Sum(l => l.Status == "Đã giải ngân" ? l.CurrentOutstandingBalance : l.Amount);
            }

            // 2. Cộng dồn Hạn mức Thẻ Tín Dụng mở theo diện Thế chấp TSĐB này (hoặc cùng Khách hàng)
            if (cards != null)
            {
                var linkedCards = cards.Where(card => card.CollateralId == Id || (card.IssuanceType == CardIssuanceType.CreditRelation && card.CustomerId == CustomerId));
                totalObligation += linkedCards.Sum(card => card.CreditLimit);
            }

            double result = Math.Round((double)(totalObligation / AppraisedValue) * 100.0, 2);
            LtvPercent = result;
            return result;
        }

        public string LtvLoanDisplay
        {
            get
            {
                if (LtvPercent > 0)
                {
                    if (LtvPercent > 1.0)
                        return $"{LtvPercent:F2}%";
                    return $"{LtvPercent * 100.0:F2}%";
                }
                return "0.00%";
            }
        }
    }
}
