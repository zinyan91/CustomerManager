using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CustomerManager.Core.Models;
using CustomerManager.Data;
using CustomerManager.Services;
using Dlg = CustomerManager.UI.UI.Dialogs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace CustomerManager.ViewModels.Pages;

public partial class LoanPortfolioViewModel : ObservableObject
{
    private readonly ILoanScheduleService _scheduleService = new LoanScheduleService();
    private readonly ICreditAssessmentService _assessmentService = new CreditAssessmentService();

    // ===== BỘ LỌC HÌNH THỨC TÍN DỤNG =====
    [ObservableProperty]
    private string _selectedFilterType = "Tất cả";

    // ===== HỢP ĐỒNG & KHOẢN VAY (GNN) ĐANG CHỌN =====
    [ObservableProperty]
    private LoanContract? _selectedContract;

    [ObservableProperty]
    private Loan? _selectedLoan;

    [ObservableProperty]
    private LoanSchedule? _selectedSchedule;

    // ===== KHÁCH HÀNG & TÀI SẢN BẢO ĐẢM =====
    [ObservableProperty]
    private Customer? _selectedCustomer;

    [ObservableProperty]
    private Collateral? _selectedCollateral;

    // ===== FORM NHẬP SỐ TIỀN & THÔNG SỐ (THÊM DẤU , REALTIME) =====
    [ObservableProperty]
    private DateTime _hdtdDueDate = DateTime.Today.AddYears(1);

    [ObservableProperty]
    private string _contractAmountInput = "0";

    [ObservableProperty]
    private string _gnnAmountInput = "0";

    [ObservableProperty]
    private string _prepaymentAmountInput = "0";

    [ObservableProperty]
    private int _contractTypeIndex = 0;

    [ObservableProperty]
    private int _rateTypeIndex = 0;

    [ObservableProperty]
    private double _preferentialRate = 7.5;

    [ObservableProperty]
    private int _preferentialMonths = 3;

    [ObservableProperty]
    private double _baseRate = 6.5;

    [ObservableProperty]
    private double _marginRate = 2.0;

    [ObservableProperty]
    private double _fixedRate = 8.5;

    [ObservableProperty]
    private int _termMonths = 5;

    [ObservableProperty]
    private int _graceMonths = 0;

    [ObservableProperty]
    private int _repaymentDayOfMonth = 15;

    [ObservableProperty]
    private DateTime _disbursementDate = DateTime.Today;

    [ObservableProperty]
    private string _purposeText = "Vay sản xuất kinh doanh / tiêu dùng";

    [ObservableProperty]
    private string _repaymentMethodText = "Gốc trả cuối kỳ, Lãi trả hàng tháng theo dư nợ thực tế";

    // ===== CẢNH BÁO THÔNG SỐ TÍNH TOÁN REALTIME =====
    [ObservableProperty]
    private decimal _maxContractAmount = 0m;

    [ObservableProperty]
    private string _maxContractAmountDisplay = "Chưa chọn TSĐB";

    [ObservableProperty]
    private bool _isContractAmountExceeded = false;

    [ObservableProperty]
    private string _contractAmountWarningMessage = "";

    [ObservableProperty]
    private double _calculatedLtvPercent = 0;

    [ObservableProperty]
    private double _maxAllowableLtvPercent = 80.0;

    [ObservableProperty]
    private string _ltvWarningMessage = "";

    [ObservableProperty]
    private string _statusMessage = "";

    // ===== BẢNG TỔNG THỐNG KÊ TOÀN BỘ KUNN / KHOẢN VAY SYSTEM =====
    [ObservableProperty]
    private decimal _totalSystemContractAmount;

    [ObservableProperty]
    private decimal _totalSystemCurrentBalance;

    [ObservableProperty]
    private decimal _totalSystemAvailableLimit;

    [ObservableProperty]
    private string _totalSystemDebtGroupDisplay = "Nhóm 1 (Đủ tiêu chuẩn)";

    public void CalculateSystemKpis()
    {
        TotalSystemContractAmount = Contracts.Sum(c => c.ContractAmount);

        decimal currentBal = 0m;
        int maxDebtGroup = 1;

        foreach (var c in Contracts)
        {
            if (c.Drawdowns != null)
            {
                foreach (var d in c.Drawdowns)
                {
                    if (d.Status == "Đã giải ngân")
                    {
                        currentBal += d.CurrentOutstandingBalance;
                        if (d.DebtGroup.HasValue && d.DebtGroup.Value > maxDebtGroup) maxDebtGroup = d.DebtGroup.Value;
                    }
                }
            }
        }

        TotalSystemCurrentBalance = currentBal;
        TotalSystemAvailableLimit = Math.Max(0m, TotalSystemContractAmount - TotalSystemCurrentBalance);
        TotalSystemDebtGroupDisplay = maxDebtGroup switch
        {
            1 => "Nhóm 1 (Đủ tiêu chuẩn)",
            2 => "Nhóm 2 (Cần chú ý)",
            3 => "Nhóm 3 (Dưới tiêu chuẩn)",
            4 => "Nhóm 4 (Nghi ngờ)",
            5 => "Nhóm 5 (Mất vốn)",
            _ => $"Nhóm {maxDebtGroup}"
        };
    }

    [ObservableProperty] private string _searchCif = "";
    [ObservableProperty] private string _searchCustomerName = "";
    [ObservableProperty] private string _searchContractOrAccount = "";

    partial void OnSearchCifChanged(string value) => _ = LoadContracts();
    partial void OnSearchCustomerNameChanged(string value) => _ = LoadContracts();
    partial void OnSearchContractOrAccountChanged(string value) => _ = LoadContracts();

    [RelayCommand]
    private async Task SearchLoanContractsAsync()
    {
        await LoadContracts();
    }

    public bool IsContractSelected => SelectedContract != null;
    public bool HasNoContracts => Contracts.Count == 0;
    public bool IsLoanSelected => SelectedLoan != null;
    public bool IsScheduleSelected => SelectedSchedule != null;
    public bool IsTermLoanType => ContractTypeIndex == 1;
    public bool IsHmtdContract => SelectedContract != null && SelectedContract.IsHmtd;

    // ===== COLLECTIONS =====
    public ObservableCollection<LoanContract> Contracts { get; } = new();
    public ObservableCollection<Loan> Loans { get; } = new();
    public ObservableCollection<LoanSchedule> LoanSchedules { get; } = new();
    public ObservableCollection<Customer> Customers { get; } = new();
    public ObservableCollection<Collateral> Collaterals { get; } = new();
    public ObservableCollection<Collateral> AvailableCollaterals { get; } = new();

    public ObservableCollection<string> FilterOptions { get; } = new() { "Tất cả hợp đồng", "Hạn Mức Tín Dụng", "Cho Vay Từng Lần" };
    public ObservableCollection<int> GnnTermOptions { get; } = new() { 3, 5, 6, 9, 12, 24, 36, 60, 120, 180, 240, 360 };
    public ObservableCollection<int> GracePeriodOptions { get; } = new() { 0, 6, 12, 18, 24, 36 };
    public ObservableCollection<int> RepaymentDayOptions { get; } = new() { 1, 5, 10, 15, 20, 25, 28, 30 };

    public LoanPortfolioViewModel()
    {
        _ = LoadData();
    }

    public async Task LoadData()
    {
        try
        {
            using var db = new AppDbContext();

            var customerList = await db.Customers.OrderBy(c => c.FullName).ToListAsync();
            Customers.Clear();
            foreach (var c in customerList) Customers.Add(c);

            var collateralList = await db.Collaterals.Include(c => c.Customer).OrderByDescending(c => c.Id).ToListAsync();
            Collaterals.Clear();
            foreach (var col in collateralList) Collaterals.Add(col);

            await LoadContracts(SelectedContract?.Id, SelectedLoan?.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp dữ liệu", ex.Message);
        }
    }

    private async Task LoadContracts(int? selectContractId = null, int? selectLoanId = null)
    {
        try
        {
            int targetContractId = selectContractId ?? SelectedContract?.Id ?? 0;

            using var db = new AppDbContext();
            var query = db.LoanContracts
                .Include(c => c.Customer)
                .Include(c => c.Collateral)
                .Include(c => c.Drawdowns)
                    .ThenInclude(d => d.LoanSchedules)
                .AsQueryable();

            bool hasFilter = false;

            if (!string.IsNullOrWhiteSpace(SearchCif))
            {
                var cif = SearchCif.Trim().ToLower();
                query = query.Where(c => c.Customer.CifKh.ToLower().Contains(cif));
                hasFilter = true;
            }

            if (!string.IsNullOrWhiteSpace(SearchCustomerName))
            {
                var name = SearchCustomerName.Trim().ToLower();
                query = query.Where(c => c.Customer.FullName.ToLower().Contains(name));
                hasFilter = true;
            }

            if (!string.IsNullOrWhiteSpace(SearchContractOrAccount))
            {
                var kw = SearchContractOrAccount.Trim().ToLower();
                query = query.Where(c => c.ContractNumber.ToLower().Contains(kw) || 
                                         (c.Customer.AccountNumber != null && c.Customer.AccountNumber.ToLower().Contains(kw)));
                hasFilter = true;
            }

            if (!hasFilter)
            {
                // Mặc định nạp 30 hợp đồng mới nhất nếu chưa gõ từ khóa tìm kiếm
                query = query.Take(30);
            }

            if (SelectedFilterType == "Hạn Mức Tín Dụng")
            {
                query = query.Where(c => c.ContractType == LoanContractType.HMTD);
            }
            else if (SelectedFilterType == "Cho Vay Từng Lần")
            {
                query = query.Where(c => c.ContractType == LoanContractType.TermLoan);
            }

            var list = await query.OrderByDescending(c => c.Id).ToListAsync();

            Contracts.Clear();
            foreach (var item in list) Contracts.Add(item);

            CalculateSystemKpis();
            OnPropertyChanged(nameof(HasNoContracts));

            if (targetContractId > 0)
            {
                SelectedContract = Contracts.FirstOrDefault(c => c.Id == targetContractId) ?? Contracts.FirstOrDefault();
            }
            else if (Contracts.Any())
            {
                SelectedContract = Contracts.FirstOrDefault();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp danh sách hợp đồng", ex.Message);
        }
    }

    private async Task LoadLoansForSelectedContract(int? selectLoanId = null)
    {
        Loans.Clear();
        if (SelectedContract == null) return;

        try
        {
            int targetLoanId = selectLoanId ?? SelectedLoan?.Id ?? 0;

            using var db = new AppDbContext();
            var list = await db.Loans
                .Include(l => l.Collateral)
                .Include(l => l.LoanSchedules)
                .Where(l => l.LoanContractId == SelectedContract.Id)
                .OrderByDescending(l => l.Id)
                .ToListAsync();

            foreach (var l in list) Loans.Add(l);

            if (targetLoanId > 0)
            {
                SelectedLoan = Loans.FirstOrDefault(l => l.Id == targetLoanId) ?? Loans.FirstOrDefault();
            }
            else
            {
                SelectedLoan = Loans.FirstOrDefault();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp Giấy Nhận Nợ", ex.Message);
        }
    }

    private async Task LoadSchedulesForSelectedLoan()
    {
        LoanSchedules.Clear();
        if (SelectedLoan == null)
        {
            GenerateSchedulePreview();
            return;
        }

        try
        {
            using var db = new AppDbContext();
            var list = await db.LoanSchedules
                .Where(s => s.LoanId == SelectedLoan.Id)
                .OrderBy(s => s.PeriodNumber)
                .ThenBy(s => s.Id)
                .ToListAsync();

            if (list.Any())
            {
                // Loại bỏ trùng lặp nếu từng bị sinh lặp kỳ
                var distinctSchedules = list
                    .GroupBy(s => s.PeriodNumber)
                    .Select(g => g.First())
                    .OrderBy(s => s.PeriodNumber)
                    .ToList();

                foreach (var s in distinctSchedules) LoanSchedules.Add(s);
            }
            else
            {
                // Nếu chưa giải ngân, sinh lịch xem trước Realtime
                GenerateSchedulePreview();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp lịch thu nợ", ex.Message);
        }
    }

    // ===== HÀM TÍNH TOÁN LỊCH THU NỢ REALTIME KHÔNG CẦN BẤM GIẢI NGÂN =====
    public void GenerateSchedulePreview()
    {
        if (SelectedLoan != null && SelectedLoan.Status == "Đã giải ngân") return;

        decimal gnnAmount = ParseDecimal(GnnAmountInput);
        if (gnnAmount <= 0)
        {
            LoanSchedules.Clear();
            return;
        }

        double appliedRate = RateTypeIndex switch
        {
            0 => PreferentialRate,
            1 => BaseRate + MarginRate,
            _ => FixedRate
        };

        var tempLoan = new Loan
        {
            Amount = gnnAmount,
            TermMonths = TermMonths,
            GracePeriodMonths = ContractTypeIndex == 0 ? 0 : GraceMonths,
            RepaymentDayOfMonth = RepaymentDayOfMonth,
            DisbursementDate = DisbursementDate,
            RateType = (InterestRateType)RateTypeIndex,
            PreferentialRate = PreferentialRate,
            PreferentialMonths = PreferentialMonths,
            BaseInterestRate = BaseRate,
            MarginRate = MarginRate,
            InterestRate = appliedRate,
            RepaymentMethod = RepaymentMethodText,
            LoanContract = SelectedContract
        };

        var previewSchedules = _scheduleService.GenerateAmortizationSchedule(tempLoan, DisbursementDate);

        LoanSchedules.Clear();
        foreach (var sch in previewSchedules)
        {
            LoanSchedules.Add(sch);
        }
    }

    // ===== LỆNH XÓA / XÓA TRẮNG FORM DEFAULTS =====
    [RelayCommand]
    private void ClearForm()
    {
        SelectedContract = null;
        SelectedLoan = null;
        ContractAmountInput = "0";
        GnnAmountInput = "0";
        PrepaymentAmountInput = "0";
        LtvWarningMessage = "";
        LoanSchedules.Clear();
        StatusMessage = "Đã làm sạch form để khởi tạo hợp đồng vay mới.";
    }

    partial void OnContractTypeIndexChanged(int value)
    {
        OnPropertyChanged(nameof(IsTermLoanType));
        if (value == 0) // HMTD
        {
            GraceMonths = 0;
            RepaymentMethodText = "Gốc trả cuối kỳ, Lãi trả hàng tháng theo dư nợ thực tế";
        }
        else
        {
            RepaymentMethodText = "Gốc trả đều hàng tháng sau ân hạn, Lãi trả hàng tháng theo dư nợ giảm dần";
        }
        GenerateSchedulePreview();
    }

    // ===== LỆNH THÊM MỚI HỢP ĐỒNG TÍN DỤNG =====
    [RelayCommand]
    private async Task CreateContract()
    {
        if (SelectedCustomer == null)
        {
            await Dlg.Warning("Thiếu thông tin", "Vui lòng chọn Khách hàng vay!");
            return;
        }

        decimal contractAmount = ParseDecimal(ContractAmountInput);
        if (contractAmount <= 0)
        {
            await Dlg.Warning("Chưa nhập hạn mức", "Vui lòng nhập Tổng hạn mức cấp hợp lệ!");
            return;
        }

        try
        {
            using var db = new AppDbContext();

            var newContract = new LoanContract
            {
                ContractNumber = $"HĐTD-{DateTime.Now:yyyyMMdd}-{Random.Shared.Next(100, 999)}",
                CustomerId = SelectedCustomer.Id,
                ContractType = (LoanContractType)ContractTypeIndex,
                ContractAmount = contractAmount,
                HdtdDueDate = HdtdDueDate,
                CollateralId = SelectedCollateral?.Id,
                LoanPurpose = PurposeText,
                DebtGroup = 1
            };

            db.LoanContracts.Add(newContract);
            await db.SaveChangesAsync();

            await Dlg.Success("Khởi tạo thành công", $"Đã khởi tạo Hợp đồng tín dụng số: {newContract.ContractNumber}");
            await LoadContracts(newContract.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi khởi tạo", ex.Message);
        }
    }

    // ===== LỆNH SỬA HỢP ĐỒNG TÍN DỤNG =====
    [RelayCommand]
    private async Task UpdateContract()
    {
        if (SelectedContract == null)
        {
            await Dlg.Warning("Chưa chọn HĐ", "Vui lòng chọn Hợp đồng tín dụng cần chỉnh sửa!");
            return;
        }

        try
        {
            using var db = new AppDbContext();
            var contract = await db.LoanContracts.FindAsync(SelectedContract.Id);
            if (contract == null) return;

            contract.ContractAmount = ParseDecimal(ContractAmountInput);
            contract.HdtdDueDate = HdtdDueDate;
            contract.CustomerId = SelectedCustomer?.Id ?? contract.CustomerId;
            contract.CollateralId = SelectedCollateral?.Id;
            contract.ContractType = (LoanContractType)ContractTypeIndex;
            contract.LoanPurpose = PurposeText;

            await db.SaveChangesAsync();
            await Dlg.Success("Cập nhật thành công", $"Đã cập nhật Hợp đồng tín dụng {contract.ContractNumber}.");
            await LoadContracts(contract.Id, SelectedLoan?.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi cập nhật", ex.Message);
        }
    }

    // ===== LỆNH XOÁ HỢP ĐỒNG TÍN DỤNG =====
    [RelayCommand]
    private async Task DeleteContract()
    {
        if (SelectedContract == null) return;

        bool confirm = await Dlg.Confirm("Xác nhận xoá", $"Bạn có chắc chắn muốn xoá Hợp đồng tín dụng {SelectedContract.ContractNumber} và toàn bộ Giấy Nhận Nợ liên quan?");
        if (!confirm) return;

        try
        {
            using var db = new AppDbContext();
            var contract = await db.LoanContracts.Include(c => c.Drawdowns).FirstOrDefaultAsync(c => c.Id == SelectedContract.Id);
            if (contract == null) return;

            db.LoanContracts.Remove(contract);
            await db.SaveChangesAsync();

            await Dlg.Success("Đã xoá", "Đã xoá thành công Hợp đồng tín dụng.");
            SelectedContract = null;
            await LoadContracts();
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xoá HĐ", ex.Message);
        }
    }

    // ===== LỆNH RÚT VỐN GNN MỚI =====
    [RelayCommand]
    private async Task CreateGnn()
    {
        if (SelectedContract == null)
        {
            await Dlg.Warning("Chưa chọn hợp đồng", "Vui lòng chọn Hợp đồng tín dụng để rút vốn GNN!");
            return;
        }

        // Quy tắc: Cho Vay Từng Lần chỉ được có tối đa 1 GNN
        if (SelectedContract.ContractType == LoanContractType.TermLoan && Loans.Any())
        {
            await Dlg.Warning("Giới hạn GNN Từng Lần", "Đối với Cho Vay Từng Lần (Term Loan), mỗi hợp đồng chỉ có duy nhất 1 Giấy Nhận Nợ!");
            return;
        }

        decimal gnnAmount = ParseDecimal(GnnAmountInput);
        if (gnnAmount <= 0)
        {
            await Dlg.Warning("Chưa nhập số tiền", "Vui lòng nhập Số tiền nhận nợ hợp lệ!");
            return;
        }

        if (SelectedContract.ContractType == LoanContractType.HMTD && gnnAmount > SelectedContract.AvailableCreditLimit)
        {
            await Dlg.Warning("Vượt hạn mức", $"Số tiền nhận nợ ({gnnAmount:N0} VNĐ) vượt quá Hạn mức còn lại ({SelectedContract.AvailableCreditLimit:N0} VNĐ)!");
            return;
        }

        double appliedRate = RateTypeIndex switch
        {
            0 => PreferentialRate,
            1 => BaseRate + MarginRate,
            _ => FixedRate
        };

        try
        {
            using var db = new AppDbContext();

            var newGnn = new Loan
            {
                LoanNumber = $"GNN-{SelectedContract.Id:000}-{Random.Shared.Next(10, 99)}",
                LoanContractId = SelectedContract.Id,
                Amount = gnnAmount,
                CurrentOutstandingBalance = 0m,
                RateType = (InterestRateType)RateTypeIndex,
                PreferentialRate = PreferentialRate,
                PreferentialMonths = PreferentialMonths,
                BaseInterestRate = BaseRate,
                MarginRate = MarginRate,
                InterestRate = appliedRate,
                TermMonths = TermMonths,
                GracePeriodMonths = ContractTypeIndex == 0 ? 0 : GraceMonths,
                RepaymentDayOfMonth = RepaymentDayOfMonth,
                DisbursementDate = DisbursementDate,
                RepaymentMethod = RepaymentMethodText,
                Purpose = PurposeText,
                CollateralId = SelectedCollateral?.Id,
                RealizedLtvRate = CalculatedLtvPercent,
                Status = "Chờ giải ngân",
                DebtGroup = 1
            };

            db.Loans.Add(newGnn);
            await db.SaveChangesAsync();

            if (SelectedCollateral != null)
            {
                var colInDb = await db.Collaterals.FindAsync(SelectedCollateral.Id);
                if (colInDb != null)
                {
                    colInDb.LtvPercent = CalculatedLtvPercent;
                    await db.SaveChangesAsync();
                }
            }

            await Dlg.Success("Rút vốn GNN thành công", $"Đã khởi tạo Giấy Nhận Nợ số {newGnn.LoanNumber} ({gnnAmount:N0} VNĐ).");
            await LoadLoansForSelectedContract(newGnn.Id);
            await LoadContracts(SelectedContract.Id, newGnn.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi tạo GNN", ex.Message);
        }
    }

    // ===== LỆNH SỬA GIẤY NHẬN NỢ =====
    [RelayCommand]
    private async Task UpdateGnn()
    {
        if (SelectedLoan == null)
        {
            await Dlg.Warning("Chưa chọn GNN", "Vui lòng chọn Giấy Nhận Nợ cần cập nhật!");
            return;
        }

        try
        {
            using var db = new AppDbContext();
            var gnn = await db.Loans.FindAsync(SelectedLoan.Id);
            if (gnn == null) return;

            gnn.Amount = ParseDecimal(GnnAmountInput);
            gnn.TermMonths = TermMonths;
            gnn.GracePeriodMonths = ContractTypeIndex == 0 ? 0 : GraceMonths;
            gnn.RepaymentDayOfMonth = RepaymentDayOfMonth;
            gnn.DisbursementDate = DisbursementDate;
            gnn.PreferentialRate = PreferentialRate;
            gnn.PreferentialMonths = PreferentialMonths;
            gnn.MarginRate = MarginRate;
            gnn.BaseInterestRate = BaseRate;
            gnn.RepaymentMethod = RepaymentMethodText;

            await db.SaveChangesAsync();
            await Dlg.Success("Cập nhật thành công", $"Đã cập nhật Giấy Nhận Nợ {gnn.LoanNumber}.");
            await LoadLoansForSelectedContract(gnn.Id);
            await LoadContracts(SelectedContract?.Id, gnn.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi cập nhật GNN", ex.Message);
        }
    }

    // ===== LỆNH XOÁ GIẤY NHẬN NỢ =====
    [RelayCommand]
    private async Task DeleteGnn()
    {
        if (SelectedLoan == null) return;

        bool confirm = await Dlg.Confirm("Xác nhận xoá", $"Bạn có chắc chắn muốn xoá Giấy Nhận Nợ {SelectedLoan.LoanNumber}?");
        if (!confirm) return;

        try
        {
            using var db = new AppDbContext();
            var gnn = await db.Loans.Include(l => l.LoanSchedules).FirstOrDefaultAsync(l => l.Id == SelectedLoan.Id);
            if (gnn == null) return;

            db.Loans.Remove(gnn);
            await db.SaveChangesAsync();

            await Dlg.Success("Đã xoá", "Đã xoá Giấy Nhận Nợ thành công.");
            SelectedLoan = null;
            await LoadLoansForSelectedContract();
            await LoadContracts(SelectedContract?.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xoá GNN", ex.Message);
        }
    }

    // ===== LỆNH PHÊ DUYỆT & GIẢI NGÂN GNN =====
    [RelayCommand]
    private async Task DisburseGnn()
    {
        if (SelectedLoan == null)
        {
            await Dlg.Warning("Chưa chọn GNN", "Hợp đồng này chưa có Giấy Nhận Nợ. Vui lòng bấm '⚡ RÚT VỐN GNN' ở Tab 1 trước khi thực hiện Giải ngân!");
            return;
        }

        var validation = await _assessmentService.ValidateDisbursementConditionsAsync(SelectedLoan.LoanContractId, SelectedLoan.Amount);
        if (!validation.CanDisburse)
        {
            await Dlg.Warning("Từ chối giải ngân", validation.Reason);
            StatusMessage = $"❌ Từ chối giải ngân: {validation.Reason}";
            return;
        }

        try
        {
            using var db = new AppDbContext();

            var loan = await db.Loans.Include(l => l.LoanContract).FirstOrDefaultAsync(l => l.Id == SelectedLoan.Id);
            if (loan == null) return;

            // Xóa sạch các kỳ lịch cũ của GNN này trước khi ghi nhận lịch giải ngân mới
            var oldSchedules = db.LoanSchedules.Where(s => s.LoanId == loan.Id);
            db.LoanSchedules.RemoveRange(oldSchedules);
            await db.SaveChangesAsync();

            loan.DisbursementDate = DisbursementDate;
            loan.TermMonths = TermMonths;
            loan.GracePeriodMonths = ContractTypeIndex == 0 ? 0 : GraceMonths;
            loan.RepaymentDayOfMonth = RepaymentDayOfMonth;
            loan.Status = "Đã giải ngân";
            loan.CurrentOutstandingBalance = loan.Amount;
            loan.DebtGroup = 1;
            loan.DaysPastDue = 0;

            var generatedSchedules = _scheduleService.GenerateAmortizationSchedule(loan, loan.DisbursementDate.Value);

            foreach (var sch in generatedSchedules)
            {
                sch.LoanId = loan.Id;
                db.LoanSchedules.Add(sch);
            }

            await db.SaveChangesAsync();

            SelectedLoan.Status = "Đã giải ngân";
            SelectedLoan.DisbursementDate = loan.DisbursementDate;
            StatusMessage = "✅ Giải ngân thành công & Đã sinh Lịch Thu Nợ tự động!";

            await Dlg.Success("Giải ngân thành công", $"Đã giải ngân Giấy Nhận Nợ {loan.LoanNumber} và tạo {generatedSchedules.Count} kỳ Lịch Thu Nợ!");
            await LoadSchedulesForSelectedLoan();
            await LoadContracts(SelectedContract?.Id, SelectedLoan.Id);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi giải ngân", ex.Message);
        }
    }

    // ===== LỆNH HẠCH TOÁN THU NỢ ĐỊNH KỲ =====
    [RelayCommand]
    private async Task CollectPayment()
    {
        if (SelectedSchedule == null)
        {
            await Dlg.Warning("Chưa chọn kỳ", "Vui lòng chọn kỳ thu nợ cần hạch toán!");
            return;
        }

        if (SelectedSchedule.IsPaid)
        {
            await Dlg.Info("Thông báo", "Kỳ thu nợ này đã được thanh toán hoàn tất!");
            return;
        }

        decimal amountToPay = SelectedSchedule.TotalAmount - (SelectedSchedule.PaidPrincipal + SelectedSchedule.PaidInterest);
        bool success = await _scheduleService.RecordPaymentAsync(SelectedSchedule.Id, amountToPay);

        if (success)
        {
            SelectedSchedule.IsPaid = true;
            SelectedSchedule.PaymentDate = DateTime.Now;
            SelectedSchedule.PaidPrincipal = SelectedSchedule.PrincipalAmount;
            SelectedSchedule.PaidInterest = SelectedSchedule.InterestAmount;

            if (SelectedLoan != null)
            {
                SelectedLoan.CurrentOutstandingBalance = Math.Max(0m, SelectedLoan.CurrentOutstandingBalance - SelectedSchedule.PrincipalAmount);
                OnPropertyChanged(nameof(SelectedLoan));
            }

            if (SelectedContract != null)
            {
                OnPropertyChanged(nameof(SelectedContract));
            }

            CalculateSystemKpis();
            await Dlg.Success("Thu nợ thành công", $"Đã hạch toán thu {amountToPay:N0} VNĐ cho Kỳ {SelectedSchedule.PeriodNumber}.");
        }
        else
        {
            await Dlg.Error("Lỗi thu nợ", "Không thể ghi nhận hạch toán thanh toán!");
        }
    }

    // ===== LỆNH HẠCH TOÁN TRẢ NỢ TRƯỚC HẠN =====
    [RelayCommand]
    private async Task RecordPrepayment()
    {
        if (SelectedLoan == null) return;

        decimal prepayAmount = ParseDecimal(PrepaymentAmountInput);
        if (prepayAmount <= 0)
        {
            await Dlg.Warning("Chưa nhập số tiền", "Vui lòng nhập số tiền hạch toán trả nợ trước hạn!");
            return;
        }

        bool success = await _scheduleService.RecordPrepaymentAsync(SelectedLoan.Id, prepayAmount);
        if (success)
        {
            await Dlg.Success("Trả nợ trước hạn thành công", $"Đã hạch toán trả nợ trước hạn {prepayAmount:N0} VNĐ cho GNN {SelectedLoan.LoanNumber}.");
            PrepaymentAmountInput = "0";
            await LoadLoansForSelectedContract(SelectedLoan.Id);
            await LoadSchedulesForSelectedLoan();
            await LoadContracts(SelectedContract?.Id, SelectedLoan.Id);
        }
        else
        {
            await Dlg.Error("Lỗi hạch toán", "Không thể thực hiện trả nợ trước hạn!");
        }
    }

    // ===== HÀM TÍNH TOÁN LTV VAY REALTIME =====
    partial void OnContractAmountInputChanged(string value)
    {
        string digits = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digits, out decimal val))
        {
            string formatted = string.Format("{0:N0}", val);
            if (formatted != value) _contractAmountInput = formatted;
        }
        CalculateLtvRealtime();
    }

    partial void OnGnnAmountInputChanged(string value)
    {
        string digits = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digits, out decimal val))
        {
            string formatted = string.Format("{0:N0}", val);
            if (formatted != value) _gnnAmountInput = formatted;
        }
        CalculateLtvRealtime();
        GenerateSchedulePreview();
    }

    partial void OnPrepaymentAmountInputChanged(string value)
    {
        string digits = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digits, out decimal val))
        {
            string formatted = string.Format("{0:N0}", val);
            if (formatted != value) _prepaymentAmountInput = formatted;
        }
    }

    partial void OnSelectedCustomerChanged(Customer? value)
    {
        RefreshAvailableCollaterals();
        CalculateLtvRealtime();
    }

    private void RefreshAvailableCollaterals()
    {
        AvailableCollaterals.Clear();
        if (SelectedCustomer == null) return;

        var customerCollaterals = Collaterals.Where(c => c.CustomerId == SelectedCustomer.Id).ToList();
        foreach (var col in customerCollaterals)
        {
            AvailableCollaterals.Add(col);
        }

        if (SelectedCollateral != null && SelectedCollateral.CustomerId != SelectedCustomer.Id)
        {
            SelectedCollateral = AvailableCollaterals.FirstOrDefault();
        }
        else if (SelectedCollateral == null)
        {
            SelectedCollateral = AvailableCollaterals.FirstOrDefault();
        }
    }

    partial void OnSelectedCollateralChanged(Collateral? value)
    {
        if (value != null)
        {
            MaxAllowableLtvPercent = (value.LtvMaxRate > 0 ? value.LtvMaxRate : 0.80) * 100.0;
        }
        CalculateLtvRealtime();
    }

    private void CalculateLtvRealtime()
    {
        if (SelectedCollateral != null && SelectedCollateral.AppraisedValue > 0)
        {
            MaxContractAmount = SelectedCollateral.MaxAllowableLoanAmount;
            double ltvMaxPct = SelectedCollateral.EffectiveMaxLtvRate * 100.0;
            MaxContractAmountDisplay = $"{MaxContractAmount:N0} VNĐ ({ltvMaxPct}% LTV Trần - {SelectedCollateral.AssetTypeDisplay})";
        }
        else
        {
            MaxContractAmount = 0m;
            MaxContractAmountDisplay = "Chưa chọn TSĐB";
        }

        decimal contractAmount = ParseDecimal(ContractAmountInput);
        if (MaxContractAmount > 0 && contractAmount > MaxContractAmount)
        {
            IsContractAmountExceeded = true;
            ContractAmountWarningMessage = $"⚠️ CẢNH BÁO: Hạn mức cấp ({contractAmount:N0} VNĐ) VƯỢT QUÁ Hạn mức cấp tối đa cho phép ({MaxContractAmount:N0} VNĐ)!";
        }
        else
        {
            IsContractAmountExceeded = false;
            ContractAmountWarningMessage = "";
        }

        decimal gnnAmount = ParseDecimal(GnnAmountInput);
        decimal assetValue = SelectedCollateral?.AppraisedValue ?? 0m;

        if (assetValue > 0)
        {
            // Tính tổng tất cả các hợp đồng/GNN vay thế chấp bởi tài sản này (hoặc thuộc về khách hàng này)
            decimal totalObligation = 0m;

            if (SelectedCustomer != null)
            {
                var customerContracts = Contracts.Where(c => c.CustomerId == SelectedCustomer.Id).ToList();
                foreach (var c in customerContracts)
                {
                    if (SelectedContract != null && c.Id == SelectedContract.Id)
                    {
                        totalObligation += gnnAmount > 0 ? gnnAmount : c.ContractAmount;
                    }
                    else
                    {
                        totalObligation += c.ContractAmount;
                    }
                }
            }

            if (totalObligation <= 0) totalObligation = gnnAmount;

            CalculatedLtvPercent = Math.Round((double)(totalObligation / assetValue) * 100.0, 2);

            if (CalculatedLtvPercent > MaxAllowableLtvPercent)
            {
                LtvWarningMessage = $"⚠️ CẢNH BÁO: LTV Vay Tổng ({CalculatedLtvPercent}%) VƯỢT QUÁ LTV Trần ({MaxAllowableLtvPercent}%)!";
            }
            else
            {
                LtvWarningMessage = $"✅ LTV Vay Tổng ({CalculatedLtvPercent}%) nằm trong hạn mức an toàn ({MaxAllowableLtvPercent}%).";
            }
        }
        else
        {
            CalculatedLtvPercent = 0;
            LtvWarningMessage = "Vui lòng chọn TSĐB và nhập Số tiền nhận nợ để tính LTV.";
        }
    }

    partial void OnSelectedFilterTypeChanged(string value)
    {
        _ = LoadContracts();
    }

    partial void OnDisbursementDateChanged(DateTime value)
    {
        if (SelectedLoan != null)
        {
            SelectedLoan.DisbursementDate = value;
            OnPropertyChanged(nameof(SelectedLoan));
        }
        GenerateSchedulePreview();
    }

    partial void OnTermMonthsChanged(int value)
    {
        if (SelectedLoan != null)
        {
            SelectedLoan.TermMonths = value;
            OnPropertyChanged(nameof(SelectedLoan));
        }
        GenerateSchedulePreview();
    }

    partial void OnGraceMonthsChanged(int value)
    {
        GenerateSchedulePreview();
    }

    partial void OnRepaymentDayOfMonthChanged(int value)
    {
        GenerateSchedulePreview();
    }

    partial void OnRateTypeIndexChanged(int value)
    {
        GenerateSchedulePreview();
    }

    partial void OnPreferentialRateChanged(double value)
    {
        GenerateSchedulePreview();
    }

    partial void OnPreferentialMonthsChanged(int value)
    {
        GenerateSchedulePreview();
    }

    partial void OnMarginRateChanged(double value)
    {
        GenerateSchedulePreview();
    }

    partial void OnBaseRateChanged(double value)
    {
        GenerateSchedulePreview();
    }

    partial void OnSelectedContractChanged(LoanContract? value)
    {
        OnPropertyChanged(nameof(IsContractSelected));
        OnPropertyChanged(nameof(IsHmtdContract));
        if (value != null)
        {
            ContractAmountInput = string.Format("{0:N0}", value.ContractAmount);
            HdtdDueDate = value.HdtdDueDate ?? DateTime.Today.AddYears(1);
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == value.CustomerId);
            SelectedCollateral = Collaterals.FirstOrDefault(c => c.Id == value.CollateralId);
            ContractTypeIndex = (int)value.ContractType;
        }
        _ = LoadLoansForSelectedContract();
    }

    partial void OnSelectedLoanChanged(Loan? value)
    {
        OnPropertyChanged(nameof(IsLoanSelected));
        StatusMessage = "";
        if (value != null)
        {
            GnnAmountInput = string.Format("{0:N0}", value.Amount);
            TermMonths = value.TermMonths;
            GraceMonths = value.GracePeriodMonths;
            RepaymentDayOfMonth = value.RepaymentDayOfMonth > 0 ? value.RepaymentDayOfMonth : 15;
            DisbursementDate = value.DisbursementDate ?? DateTime.Today;
            RateTypeIndex = (int)value.RateType;
            PreferentialRate = value.PreferentialRate;
            PreferentialMonths = value.PreferentialMonths;
            BaseRate = value.BaseInterestRate;
            MarginRate = value.MarginRate;
        }
        _ = LoadSchedulesForSelectedLoan();
    }

    partial void OnSelectedScheduleChanged(LoanSchedule? value)
    {
        OnPropertyChanged(nameof(IsScheduleSelected));
    }

    private static decimal ParseDecimal(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0m;
        string digits = new string(text.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, out decimal val) ? val : 0m;
    }
}