namespace CustomerManager.Core.Models
{
    public class LoanCollateral
    {
        public int LoanContractId { get; set; }
        public LoanContract LoanContract { get; set; } = null!;

        public int CollateralId { get; set; }
        public Collateral Collateral { get; set; } = null!;
    }
}
