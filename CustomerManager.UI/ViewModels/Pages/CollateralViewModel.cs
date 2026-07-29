using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CustomerManager.Core.Models;
using CustomerManager.Data;
using Dlg = CustomerManager.UI.UI.Dialogs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace CustomerManager.ViewModels.Pages;

public partial class CollateralViewModel : ObservableObject
{
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(IsCollateralSelected))]
    [NotifyPropertyChangedFor(nameof(SubmitButtonText))]
    [NotifyPropertyChangedFor(nameof(FormTitle))]
    private Collateral? _selectedCollateral;

    public bool IsCollateralSelected => SelectedCollateral != null;
    public string SubmitButtonText => IsCollateralSelected ? "🔄 CẬP NHẬT CHỨNG THƯ ĐỊNH GIÁ" : "🏡 LƯU THÔNG TIN TSĐB";
    public string FormTitle => IsCollateralSelected ? "CẬP NHẬT ĐỊNH GIÁ TSĐB" : "ĐỊNH GIÁ TSĐB MỚI";

    // MÃ CHỨNG THƯ ĐỊNH GIÁ DO BANKER TỰ NHẬP
    [ObservableProperty]
    private string _inputAssetCode = "";

    // DROPDOWN 1: NHÓM TÀI SẢN BẢO ĐẢM TỔNG QUÁT
    public List<string> MainAssetGroupOptions { get; } = new()
    {
        "Bất động sản",
        "Phương tiện vận tải (Ô tô/Tàu thuyền)",
        "Sổ tiết kiệm / Giấy tờ có giá",
        "Máy móc thiết bị / Hàng hóa",
        "Hạn chế nhận TSBĐ",
        "Tùy chỉnh (Ngoại lệ được duyệt)"
    };

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(IsRealEstateGroup))]
    [NotifyPropertyChangedFor(nameof(IsCustomLtvAllowed))]
    private string _inputMainAssetGroup = "Bất động sản";

    public bool IsRealEstateGroup => InputMainAssetGroup == "Bất động sản";

    // DROPDOWN 2: XẾP LOẠI BĐS (80 - 70 - 60 - 55 - HẠN CHẾ)
    public List<string> RealEstateClassOptions { get; } = new()
    {
        "Loại 1 (LTV 80%)",
        "Loại 2 (LTV 70%)",
        "Loại 3 (LTV 60%)",
        "Loại 4 (LTV 55%)",
        "Hạn chế (LTV 0%)",
        "Tùy chỉnh BĐS (Ngoại lệ)"
    };

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(IsCustomLtvAllowed))]
    private string _inputRealEstateClass = "Loại 1 (LTV 80%)";

    public bool IsCustomLtvAllowed => InputMainAssetGroup.Contains("Tùy chỉnh") || (IsRealEstateGroup && InputRealEstateClass.Contains("Tùy chỉnh"));

    partial void OnInputMainAssetGroupChanged(string value)
    {
        UpdateCalculatedLtv();
    }

    partial void OnInputRealEstateClassChanged(string value)
    {
        UpdateCalculatedLtv();
    }

    private void UpdateCalculatedLtv()
    {
        if (IsRealEstateGroup)
        {
            if (InputRealEstateClass.Contains("Loại 1")) InputLtvMaxRate = 0.80;
            else if (InputRealEstateClass.Contains("Loại 2")) InputLtvMaxRate = 0.70;
            else if (InputRealEstateClass.Contains("Loại 3")) InputLtvMaxRate = 0.60;
            else if (InputRealEstateClass.Contains("Loại 4")) InputLtvMaxRate = 0.55;
            else if (InputRealEstateClass.Contains("Hạn chế")) InputLtvMaxRate = 0.00;
        }
        else
        {
            if (InputMainAssetGroup.Contains("Phương tiện")) InputLtvMaxRate = 0.60;
            else if (InputMainAssetGroup.Contains("Sổ tiết kiệm")) InputLtvMaxRate = 0.90;
            else if (InputMainAssetGroup.Contains("Máy móc")) InputLtvMaxRate = 0.50;
            else if (InputMainAssetGroup.Contains("Hạn chế")) InputLtvMaxRate = 0.00;
        }
    }

    // GIÁ TRỊ TÀI SẢN TỰ ĐỘNG THÊM DẤU PHẨY REAL-TIME KHI NHẬP
    [ObservableProperty]
    private string _inputAppraisedValueText = "0";

    [ObservableProperty]
    private decimal _inputAppraisedValue = 0;

    partial void OnInputAppraisedValueTextChanged(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            _inputAppraisedValue = 0;
            return;
        }

        string digitsOnly = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digitsOnly, out decimal parsed))
        {
            _inputAppraisedValue = parsed;
            string formatted = parsed.ToString("N0");
            if (_inputAppraisedValueText != formatted)
            {
                _inputAppraisedValueText = formatted;
                OnPropertyChanged(nameof(InputAppraisedValueText));
            }
        }
        else
        {
            _inputAppraisedValue = 0;
            _inputAppraisedValueText = "0";
            OnPropertyChanged(nameof(InputAppraisedValueText));
        }
    }

    [ObservableProperty]
    private string _inputAddress = "";

    [ObservableProperty]
    private double _inputLtvMaxRate = 0.80;

    [ObservableProperty]
    private DateTime _inputAppraisalDate = DateTime.Today;

    public List<int> ValidityMonthsOptions { get; } = new() { 6, 12, 24 };

    [ObservableProperty]
    private int _inputValidityMonths = 12;

    [ObservableProperty]
    private string _inputNote = "";

    [ObservableProperty]
    private int _selectedCustomerId;

    [ObservableProperty]
    private int _filterCustomerId = 0;

    [ObservableProperty]
    private int _filteredCollateralCount;

    [ObservableProperty]
    private decimal _filteredTotalAppraisedValue;

    public ObservableCollection<Collateral> Collaterals { get; } = new();
    public ObservableCollection<Customer> Customers { get; } = new();
    public ObservableCollection<CustomerFilterItem> FilterCustomerList { get; } = new();

    public CollateralViewModel()
    {
        _ = LoadData();
    }

    [ObservableProperty] private string _searchCif = "";
    [ObservableProperty] private string _searchOwnerName = "";
    [ObservableProperty] private string _searchAssetCode = "";

    partial void OnSearchCifChanged(string value) => _ = ApplyFilter();
    partial void OnSearchOwnerNameChanged(string value) => _ = ApplyFilter();
    partial void OnSearchAssetCodeChanged(string value) => _ = ApplyFilter();

    partial void OnFilterCustomerIdChanged(int value)
    {
        _ = ApplyFilter();
    }

    public async Task LoadData()
    {
        try
        {
            using var db = new AppDbContext();
            
            var customerList = await db.Customers.AsNoTracking().OrderBy(c => c.FullName).ToListAsync();
            Customers.Clear();
            FilterCustomerList.Clear();

            FilterCustomerList.Add(new CustomerFilterItem { Id = 0, DisplayName = "🌐 Tất cả khách hàng (Toàn bộ danh mục)" });

            foreach (var c in customerList)
            {
                Customers.Add(c);
                FilterCustomerList.Add(new CustomerFilterItem { Id = c.Id, DisplayName = $"👤 {c.FullName} ({c.CifKh})" });
            }

            FilterCustomerId = 0;

            if (Customers.Count > 0 && (SelectedCustomerId <= 0 || !Customers.Any(c => c.Id == SelectedCustomerId)))
            {
                SelectedCustomerId = Customers[0].Id;
            }

            await ApplyFilter();
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp TSĐB", $"Lỗi truy vấn dữ liệu từ Supabase Cloud: {ex.Message}");
        }
    }

    private async Task ApplyFilter()
    {
        try
        {
            using var db = new AppDbContext();
            var query = db.Collaterals.Include(c => c.Customer).AsQueryable();

            if (FilterCustomerId > 0)
            {
                query = query.Where(c => c.CustomerId == FilterCustomerId);
            }

            if (!string.IsNullOrWhiteSpace(SearchCif))
            {
                var cif = SearchCif.Trim().ToLower();
                query = query.Where(c => c.Customer.CifKh.ToLower().Contains(cif));
            }

            if (!string.IsNullOrWhiteSpace(SearchOwnerName))
            {
                var name = SearchOwnerName.Trim().ToLower();
                query = query.Where(c => c.Customer.FullName.ToLower().Contains(name));
            }

            if (!string.IsNullOrWhiteSpace(SearchAssetCode))
            {
                var code = SearchAssetCode.Trim().ToLower();
                query = query.Where(c => c.AssetCode != null && c.AssetCode.ToLower().Contains(code));
            }

            var list = await query.OrderByDescending(c => c.Id).ToListAsync();

            List<LoanContract> allContracts = new();
            try { allContracts = await db.LoanContracts.Include(c => c.Drawdowns).AsNoTracking().ToListAsync(); } catch { }

            List<Loan> allLoans = new();
            try { allLoans = await db.Loans.Include(l => l.LoanContract).AsNoTracking().ToListAsync(); } catch { }

            List<CreditCard> allCards = new();
            try { allCards = await db.CreditCards.AsNoTracking().ToListAsync(); } catch { }

            Collaterals.Clear();
            decimal totalVal = 0;
            foreach (var item in list)
            {
                item.CalculateActualLtv(allContracts, allLoans, allCards);
                Collaterals.Add(item);
                totalVal += item.AppraisedValue;
            }

            FilteredCollateralCount = Collaterals.Count;
            FilteredTotalAppraisedValue = totalVal;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Lỗi ApplyFilter: {ex.Message}");
        }
    }

    [RelayCommand]
    private void ClearSelection()
    {
        SelectedCollateral = null;
        InputAssetCode = "";
        InputAddress = "";
        InputAppraisedValueText = "0";
        InputNote = "";
        InputAppraisalDate = DateTime.Today;
        InputValidityMonths = 12;
        InputMainAssetGroup = "Bất động sản";
        InputRealEstateClass = "Loại 1 (LTV 80%)";
        if (Customers.Count > 0) SelectedCustomerId = Customers[0].Id;
    }

    partial void OnSelectedCollateralChanged(Collateral? value)
    {
        if (value != null)
        {
            InputAssetCode = value.AssetCodeDisplay;
            InputAddress = value.Address;
            InputAppraisedValueText = value.AppraisedValue.ToString("N0");
            InputLtvMaxRate = value.LtvMaxRate;
            InputAppraisalDate = value.AppraisalDate ?? DateTime.Today;
            InputValidityMonths = value.AppraisalValidMonths ?? 12;
            InputNote = value.Note ?? "";
            if (value.CustomerId > 0) SelectedCustomerId = value.CustomerId;

            // Đồng bộ Nhóm tài sản & Xếp loại BĐS theo đúng tài sản vừa click chọn
            if (!string.IsNullOrWhiteSpace(value.AssetType))
            {
                if (value.AssetType.Contains("Loại 1")) { InputMainAssetGroup = "Bất động sản"; InputRealEstateClass = "Loại 1 (LTV 80%)"; }
                else if (value.AssetType.Contains("Loại 2")) { InputMainAssetGroup = "Bất động sản"; InputRealEstateClass = "Loại 2 (LTV 70%)"; }
                else if (value.AssetType.Contains("Loại 3")) { InputMainAssetGroup = "Bất động sản"; InputRealEstateClass = "Loại 3 (LTV 60%)"; }
                else if (value.AssetType.Contains("Loại 4")) { InputMainAssetGroup = "Bất động sản"; InputRealEstateClass = "Loại 4 (LTV 55%)"; }
                else if (value.AssetType.Contains("Hạn chế")) { InputMainAssetGroup = "Bất động sản"; InputRealEstateClass = "Hạn chế (LTV 0%)"; }
                else if (value.AssetType.Contains("Phương tiện")) { InputMainAssetGroup = "Phương tiện vận tải (Ô tô/Tàu thuyền)"; }
                else if (value.AssetType.Contains("Sổ tiết kiệm") || value.AssetType.Contains("GT có giá")) { InputMainAssetGroup = "Sổ tiết kiệm / Giấy tờ có giá"; }
                else if (value.AssetType.Contains("Máy móc")) { InputMainAssetGroup = "Máy móc thiết bị / Hàng hóa"; }
                else
                {
                    InputMainAssetGroup = "Bất động sản";
                    InputRealEstateClass = "Loại 1 (LTV 80%)";
                }
            }
        }
    }

    [RelayCommand]
    private async Task SaveOrUpdateCollateral()
    {
        if (InputAppraisedValue <= 0 || string.IsNullOrWhiteSpace(InputAddress))
        {
            await Dlg.Warning("Thiếu thông tin", "Vui lòng nhập Địa chỉ và Giá trị tài sản (> 0)!");
            return;
        }

        if (SelectedCustomerId <= 0)
        {
            await Dlg.Warning("Thiếu thông tin", "Vui lòng chọn Khách hàng chủ sở hữu TSĐB!");
            return;
        }

        string fullAssetType = IsRealEstateGroup ? $"BĐS: {InputRealEstateClass}" : InputMainAssetGroup;
        string assetCode = string.IsNullOrWhiteSpace(InputAssetCode) ? $"CT-{DateTime.Now:yyyyMMdd}-{new Random().Next(100, 999)}" : InputAssetCode.Trim();

        try
        {
            using var db = new AppDbContext();

            if (SelectedCollateral != null)
            {
                // CẬP NHẬT CHỨNG THƯ ĐỊNH GIÁ HIỆN CÓ
                var dbCollateral = await db.Collaterals.FindAsync(SelectedCollateral.Id);
                if (dbCollateral != null)
                {
                    dbCollateral.AssetCode = assetCode;
                    dbCollateral.CustomerId = SelectedCustomerId;
                    dbCollateral.Address = InputAddress.Trim();
                    dbCollateral.AppraisedValue = InputAppraisedValue;
                    dbCollateral.Value = InputAppraisedValue;
                    dbCollateral.AssetType = fullAssetType;
                    dbCollateral.LtvMaxRate = InputLtvMaxRate;
                    dbCollateral.AppraisalDate = InputAppraisalDate;
                    dbCollateral.AppraisalValidMonths = InputValidityMonths;
                    dbCollateral.Note = InputNote;

                    db.Collaterals.Update(dbCollateral);
                    await db.SaveChangesAsync();

                    await Dlg.Success("Thành công", $"Đã tái định giá và cập nhật chứng thư mới cho tài sản '{assetCode}'!");
                }
            }
            else
            {
                // THÊM MỚI TÀI SẢN BẢO ĐẢM
                var newCollateral = new Collateral
                {
                    AssetCode = assetCode,
                    CustomerId = SelectedCustomerId,
                    Address = InputAddress.Trim(),
                    AppraisedValue = InputAppraisedValue,
                    Value = InputAppraisedValue,
                    AssetType = fullAssetType,
                    LtvMaxRate = InputLtvMaxRate,
                    AppraisalDate = InputAppraisalDate,
                    AppraisalValidMonths = InputValidityMonths,
                    Note = InputNote
                };

                db.Collaterals.Add(newCollateral);
                await db.SaveChangesAsync();

                await Dlg.Success("Thành công", $"Đã khởi tạo thành công tài sản bảo đảm mới '{assetCode}'!");
            }

            await LoadData();
            ClearSelection();
        }
        catch (Exception ex)
        {
            string detail = ex.InnerException?.Message ?? ex.Message;
            await Dlg.Error("Lỗi lưu TSĐB", detail);
        }
    }

    [RelayCommand]
    private async Task DeleteCollateral()
    {
        if (SelectedCollateral == null)
        {
            await Dlg.Warning("Chưa chọn tài sản", "Vui lòng chọn Tài sản bảo đảm cần xoá!");
            return;
        }

        bool confirm = await Dlg.Confirm("Xác nhận xoá TSĐB", $"Bạn có chắc chắn muốn xoá TSĐB '{SelectedCollateral.AssetCodeDisplay}' ({SelectedCollateral.AppraisedValue:N0} VNĐ)?");
        if (!confirm) return;

        try
        {
            using var db = new AppDbContext();

            bool hasContracts = await db.LoanContracts.AnyAsync(c => c.CollateralId == SelectedCollateral.Id);
            if (hasContracts)
            {
                await Dlg.Error("Không thể xoá", "Tài sản bảo đảm này đang được thế chấp cho Hợp đồng tín dụng. Vui lòng giải chấp HĐTD trước khi xoá!");
                return;
            }

            var col = await db.Collaterals.FindAsync(SelectedCollateral.Id);
            if (col != null)
            {
                db.Collaterals.Remove(col);
                await db.SaveChangesAsync();
                await Dlg.Success("Đã xoá", "Đã xoá tài sản bảo đảm thành công.");
                ClearSelection();
                await LoadData();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xoá TSĐB", ex.Message);
        }
    }
}

public class CustomerFilterItem
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = "";

    public override string ToString() => DisplayName;
}
