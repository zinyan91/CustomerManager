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

public partial class CustomerListViewModel : ObservableObject
{
    [ObservableProperty] private string _searchCif = "";
    [ObservableProperty] private string _searchName = "";
    [ObservableProperty] private string _searchNationalId = "";

    // Đang chọn Khách hàng để Xem/Sửa/Xoá
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(IsCustomerSelected))]
    private Customer? _selectedCustomer;

    public bool IsCustomerSelected => SelectedCustomer != null;
    [ObservableProperty] private Customer? _selectedCustomerDetail;
    [ObservableProperty] private bool _isDetailsPopupOpen = false;

    // Dữ liệu pháp lý Khách hàng
    [ObservableProperty] private string _inputCif = "";
    [ObservableProperty] private string _inputFullName = "";
    [ObservableProperty] private string _inputNationalId = "";
    [ObservableProperty] private string _inputPhone = "";
    [ObservableProperty] private string _inputEmail = "";
    [ObservableProperty] private string _inputAddress = "";
    [ObservableProperty] private string _inputCifKhlq = "";
    [ObservableProperty] private string _inputAccountNumber = "";
    [ObservableProperty] private string _inputSpouseAccountNumber = "";

    [ObservableProperty] private string _inputMonthlyIncomeText = "0";
    [ObservableProperty] private decimal _inputMonthlyIncome = 0;

    partial void OnInputMonthlyIncomeTextChanged(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            _inputMonthlyIncome = 0;
            return;
        }

        string digitsOnly = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digitsOnly, out decimal parsed))
        {
            _inputMonthlyIncome = parsed;
            string formatted = parsed.ToString("N0");
            if (_inputMonthlyIncomeText != formatted)
            {
                _inputMonthlyIncomeText = formatted;
                OnPropertyChanged(nameof(InputMonthlyIncomeText));
            }
        }
        else
        {
            _inputMonthlyIncome = 0;
            _inputMonthlyIncomeText = "0";
            OnPropertyChanged(nameof(InputMonthlyIncomeText));
        }
    }

    [ObservableProperty] 
    [NotifyPropertyChangedFor(nameof(IsMarried))]
    private string _inputMaritalStatus = "Độc thân";

    public List<string> MaritalStatusOptions { get; } = new()
    {
        "Độc thân",
        "Đã kết hôn",
        "Ly hôn",
        "Góa"
    };

    public bool IsMarried => InputMaritalStatus == "Đã kết hôn";

    [ObservableProperty] private string _inputSpouseName = "";
    [ObservableProperty] private string _inputSpouseNationalId = "";
    [ObservableProperty] private string _inputSpousePhone = "";

    [ObservableProperty] private string _inputSpouseIncomeText = "0";
    [ObservableProperty] private decimal _inputSpouseIncome = 0;

    partial void OnInputSpouseIncomeTextChanged(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            _inputSpouseIncome = 0;
            return;
        }

        string digitsOnly = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digitsOnly, out decimal parsed))
        {
            _inputSpouseIncome = parsed;
            string formatted = parsed.ToString("N0");
            if (_inputSpouseIncomeText != formatted)
            {
                _inputSpouseIncomeText = formatted;
                OnPropertyChanged(nameof(InputSpouseIncomeText));
            }
        }
        else
        {
            _inputSpouseIncome = 0;
            _inputSpouseIncomeText = "0";
            OnPropertyChanged(nameof(InputSpouseIncomeText));
        }
    }

    [ObservableProperty] private bool _isCccdMasked = true;
    public string SubmitButtonText => SelectedCustomer == null ? "💾 LƯU HỒ SƠ KHÁCH HÀNG" : "✏️ CẬP NHẬT HỒ SƠ KHÁCH HÀNG";

    public ObservableCollection<Customer> Customers { get; } = new();

    public CustomerListViewModel()
    {
        _ = LoadData();
    }

    partial void OnSelectedCustomerChanged(Customer? value)
    {
        OnPropertyChanged(nameof(SubmitButtonText));
        if (value != null)
        {
            InputCif = value.CifKh;
            InputFullName = value.FullName;
            InputNationalId = value.NationalId ?? "";
            InputPhone = value.Phone ?? "";
            InputEmail = value.Email ?? "";
            InputAddress = value.Address ?? "";
            InputAccountNumber = value.AccountNumber ?? "";
            InputMonthlyIncomeText = value.MonthlyIncome.ToString("N0");
            InputMaritalStatus = string.IsNullOrWhiteSpace(value.MaritalStatus) ? "Độc thân" : value.MaritalStatus;
            InputCifKhlq = value.CifKhlq ?? "";
            InputSpouseName = value.SpouseName ?? "";
            InputSpouseNationalId = value.SpouseNationalId ?? "";
            InputSpousePhone = value.SpousePhone ?? "";
            InputSpouseAccountNumber = value.SpouseAccountNumber ?? "";
            InputSpouseIncomeText = value.SpouseIncome.ToString("N0");
        }
    }

    [RelayCommand]
    private void ClearSelection()
    {
        SelectedCustomer = null;
        InputCif = "";
        InputFullName = "";
        InputNationalId = "";
        InputPhone = "";
        InputEmail = "";
        InputAddress = "";
        InputAccountNumber = "";
        InputMonthlyIncomeText = "0";
        InputMaritalStatus = "Độc thân";
        InputCifKhlq = "";
        InputSpouseName = "";
        InputSpouseNationalId = "";
        InputSpousePhone = "";
        InputSpouseAccountNumber = "";
        InputSpouseIncomeText = "0";
        OnPropertyChanged(nameof(SubmitButtonText));
    }

    [RelayCommand]
    private void ToggleCccdMask()
    {
        IsCccdMasked = !IsCccdMasked;
    }

    [RelayCommand]
    private void ShowCustomerDetails(Customer? customer)
    {
        var target = customer ?? SelectedCustomer;
        if (target == null) return;
        SelectedCustomerDetail = target;
        IsDetailsPopupOpen = true;
    }

    [RelayCommand]
    private void CloseDetailsPopup()
    {
        IsDetailsPopupOpen = false;
        SelectedCustomerDetail = null;
    }

    public async Task LoadData()
    {
        try
        {
            AppDbContext.InitializeDatabase();
            using var db = new AppDbContext();
            var list = await db.Customers.AsNoTracking().OrderByDescending(x => x.Id).Take(100).ToListAsync();

            Customers.Clear();
            foreach (var item in list) Customers.Add(item);
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi kết nối Supabase", $"Không thể tải danh sách khách hàng: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task SearchAsync()
    {
        if (string.IsNullOrWhiteSpace(SearchCif) &&
            string.IsNullOrWhiteSpace(SearchName) &&
            string.IsNullOrWhiteSpace(SearchNationalId))
        {
            await LoadData();
            return;
        }

        try
        {
            using var db = new AppDbContext();
            var query = db.Customers.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(SearchCif))
                query = query.Where(x => x.CifKh.Contains(SearchCif.Trim()));

            if (!string.IsNullOrWhiteSpace(SearchName))
            {
                var nameLower = SearchName.Trim().ToLower();
                query = query.Where(x => x.FullName.ToLower().Contains(nameLower));
            }

            if (!string.IsNullOrWhiteSpace(SearchNationalId))
                query = query.Where(x => x.NationalId != null && x.NationalId.Contains(SearchNationalId.Trim()));

            var results = await query.Take(100).ToListAsync();

            Customers.Clear();
            foreach (var cus in results) Customers.Add(cus);

            if (Customers.Count == 0)
            {
                await Dlg.Info("Thông báo", "Không tìm thấy khách hàng nào khớp với điều kiện.");
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi Supabase", $"Lỗi truy vấn cơ sở dữ liệu: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task SaveProfile()
    {
        if (string.IsNullOrWhiteSpace(InputFullName) || string.IsNullOrWhiteSpace(InputCif))
        {
            await Dlg.Warning("Thiếu thông tin", "Mã CIF và Họ tên khách hàng là bắt buộc!");
            return;
        }

        if (IsMarried && string.IsNullOrWhiteSpace(InputSpouseName))
        {
            await Dlg.Warning("Thiếu thông tin Vợ/Chồng", "Trạng thái 'Đã kết hôn' yêu cầu nhập Họ và tên Vợ/Chồng!");
            return;
        }

        try
        {
            using var db = new AppDbContext();

            if (SelectedCustomer != null)
            {
                // CẬP NHẬT KHÁCH HÀNG ĐANG CHỌN
                var cus = await db.Customers.FindAsync(SelectedCustomer.Id);
                if (cus != null)
                {
                    cus.CifKh = InputCif.Trim();
                    cus.FullName = InputFullName.Trim();
                    cus.NationalId = InputNationalId.Trim();
                    cus.Phone = InputPhone.Trim();
                    cus.Email = InputEmail.Trim();
                    cus.Address = InputAddress.Trim();
                    cus.AccountNumber = string.IsNullOrWhiteSpace(InputAccountNumber) ? null : InputAccountNumber.Trim();
                    cus.MonthlyIncome = InputMonthlyIncome;
                    cus.MaritalStatus = InputMaritalStatus;
                    cus.CifKhlq = string.IsNullOrWhiteSpace(InputCifKhlq) ? null : InputCifKhlq.Trim();
                    cus.SpouseName = IsMarried ? InputSpouseName.Trim() : null;
                    cus.SpouseNationalId = IsMarried ? InputSpouseNationalId.Trim() : null;
                    cus.SpousePhone = IsMarried ? InputSpousePhone.Trim() : null;
                    cus.SpouseAccountNumber = IsMarried && !string.IsNullOrWhiteSpace(InputSpouseAccountNumber) ? InputSpouseAccountNumber.Trim() : null;
                    cus.SpouseIncome = IsMarried ? InputSpouseIncome : 0;

                    db.Customers.Update(cus);
                    await db.SaveChangesAsync();
                    await Dlg.Success("Cập nhật thành công", $"Đã cập nhật hồ sơ cá nhân cho KH '{cus.FullName}' (CIF: {cus.CifKh}).");
                }
            }
            else
            {
                // THÊM MỚI KHÁCH HÀNG
                var newCustomer = new Customer
                {
                    CifKh = this.InputCif.Trim(),
                    FullName = this.InputFullName.Trim(),
                    NationalId = this.InputNationalId.Trim(),
                    Phone = this.InputPhone.Trim(),
                    Email = this.InputEmail.Trim(),
                    Address = this.InputAddress.Trim(),
                    AccountNumber = string.IsNullOrWhiteSpace(InputAccountNumber) ? null : InputAccountNumber.Trim(),
                    MonthlyIncome = this.InputMonthlyIncome,
                    MaritalStatus = this.InputMaritalStatus,
                    CifKhlq = string.IsNullOrWhiteSpace(InputCifKhlq) ? null : InputCifKhlq.Trim(),
                    SpouseName = IsMarried ? this.InputSpouseName.Trim() : null,
                    SpouseNationalId = IsMarried ? this.InputSpouseNationalId.Trim() : null,
                    SpousePhone = IsMarried ? this.InputSpousePhone.Trim() : null,
                    SpouseAccountNumber = IsMarried && !string.IsNullOrWhiteSpace(InputSpouseAccountNumber) ? InputSpouseAccountNumber.Trim() : null,
                    SpouseIncome = IsMarried ? this.InputSpouseIncome : 0
                };

                db.Customers.Add(newCustomer);
                await db.SaveChangesAsync();
                await Dlg.Success("Khởi tạo thành công", $"Đã lưu hồ sơ cá nhân cho KH '{newCustomer.FullName}' (CIF: {newCustomer.CifKh})!");
            }

            ClearSelection();
            await LoadData();
        }
        catch (Exception ex)
        {
            string detail = ex.InnerException?.Message ?? ex.Message;
            await Dlg.Error("Lỗi lưu trữ", $"Không thể lưu hồ sơ: {detail}");
        }
    }

    [RelayCommand]
    private async Task DeleteCustomer()
    {
        if (SelectedCustomer == null)
        {
            await Dlg.Warning("Chưa chọn KH", "Vui lòng chọn Khách hàng cần xoá!");
            return;
        }

        bool confirm = await Dlg.Confirm("Xác nhận xoá KH", $"Bạn có chắc chắn muốn xoá Khách hàng '{SelectedCustomer.FullName}' (CIF: {SelectedCustomer.CifKh})?");
        if (!confirm) return;

        try
        {
            using var db = new AppDbContext();

            bool hasContracts = await db.LoanContracts.AnyAsync(c => c.CustomerId == SelectedCustomer.Id);
            bool hasCollaterals = await db.Collaterals.AnyAsync(c => c.CustomerId == SelectedCustomer.Id);
            if (hasContracts || hasCollaterals)
            {
                await Dlg.Error("Không thể xoá", "Khách hàng này đang có Hợp đồng tín dụng hoặc Tài sản thế chấp trong hệ thống. Vui lòng xử lý HĐTD/TSĐB trước khi xoá!");
                return;
            }

            var cus = await db.Customers.FindAsync(SelectedCustomer.Id);
            if (cus != null)
            {
                db.Customers.Remove(cus);
                await db.SaveChangesAsync();
                await Dlg.Success("Đã xoá", "Đã xoá khách hàng thành công.");
                ClearSelection();
                await LoadData();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xoá KH", ex.Message);
        }
    }

    [RelayCommand]
    private async Task ImportCustomersAsync()
    {
        try
        {
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Title = "Chọn tệp dữ liệu Khách hàng để Nhập (Import)",
                Filter = "Dữ liệu CSV / JSON (*.csv;*.json)|*.csv;*.json|Tất cả tệp (*.*)|*.*"
            };

            if (dialog.ShowDialog() == true)
            {
                var filePath = dialog.FileName;
                var extension = System.IO.Path.GetExtension(filePath).ToLower();
                int importedCount = 0;

                using var db = new AppDbContext();

                if (extension == ".json")
                {
                    var jsonText = await System.IO.File.ReadAllTextAsync(filePath);
                    var items = System.Text.Json.JsonSerializer.Deserialize<List<CustomerImportDto>>(jsonText);
                    if (items != null)
                    {
                        foreach (var dto in items)
                        {
                            if (string.IsNullOrWhiteSpace(dto.cif_kh) && string.IsNullOrWhiteSpace(dto.full_name)) continue;
                            string cif = string.IsNullOrWhiteSpace(dto.cif_kh) ? $"CIF_{DateTime.Now:yyyyMMddHHmmss}_{importedCount+1}" : dto.cif_kh.Trim();
                            
                            var existing = await db.Customers.FirstOrDefaultAsync(c => c.CifKh == cif);
                            if (existing == null)
                            {
                                db.Customers.Add(new Customer
                                {
                                    CifKh = cif,
                                    CifKhlq = string.IsNullOrWhiteSpace(dto.cif_khlq) ? null : dto.cif_khlq.Trim(),
                                    FullName = dto.full_name?.Trim() ?? "Khách hàng mới",
                                    MaritalStatus = string.IsNullOrWhiteSpace(dto.marital_status) ? "Độc thân" : dto.marital_status.Trim(),
                                    SpouseName = string.IsNullOrWhiteSpace(dto.spouse_name) ? null : dto.spouse_name.Trim(),
                                    AccountNumber = string.IsNullOrWhiteSpace(dto.account_number) ? null : dto.account_number.Trim(),
                                    SpouseAccountNumber = string.IsNullOrWhiteSpace(dto.spouse_account_number) ? null : dto.spouse_account_number.Trim()
                                });
                                importedCount++;
                            }
                        }
                    }
                }
                else if (extension == ".csv")
                {
                    var lines = await System.IO.File.ReadAllLinesAsync(filePath);
                    if (lines.Length > 1)
                    {
                        for (int i = 1; i < lines.Length; i++)
                        {
                            var line = lines[i].Trim();
                            if (string.IsNullOrWhiteSpace(line)) continue;

                            var parts = line.Split(',');
                            if (parts.Length < 3) continue;

                            string cif = parts[0].Trim().Trim('"');
                            string cifLq = parts.Length > 1 ? parts[1].Trim().Trim('"') : "";
                            string fullName = parts.Length > 2 ? parts[2].Trim().Trim('"') : "";
                            string marital = parts.Length > 3 ? parts[3].Trim().Trim('"') : "Độc thân";
                            string spouse = parts.Length > 4 ? parts[4].Trim().Trim('"') : "";
                            string stk = parts.Length > 5 ? parts[5].Trim().Trim('"') : "";
                            string stkSpouse = parts.Length > 6 ? parts[6].Trim().Trim('"') : "";

                            if (string.IsNullOrWhiteSpace(cif) && string.IsNullOrWhiteSpace(fullName)) continue;
                            if (string.IsNullOrWhiteSpace(cif)) cif = $"CIF_{DateTime.Now:yyyyMMddHHmmss}_{i}";

                            var existing = await db.Customers.FirstOrDefaultAsync(c => c.CifKh == cif);
                            if (existing == null)
                            {
                                db.Customers.Add(new Customer
                                {
                                    CifKh = cif,
                                    CifKhlq = string.IsNullOrWhiteSpace(cifLq) ? null : cifLq,
                                    FullName = string.IsNullOrWhiteSpace(fullName) ? "Khách hàng mới" : fullName,
                                    MaritalStatus = string.IsNullOrWhiteSpace(marital) ? "Độc thân" : marital,
                                    SpouseName = string.IsNullOrWhiteSpace(spouse) ? null : spouse,
                                    AccountNumber = string.IsNullOrWhiteSpace(stk) ? null : stk,
                                    SpouseAccountNumber = string.IsNullOrWhiteSpace(stkSpouse) ? null : stkSpouse
                                });
                                importedCount++;
                            }
                        }
                    }
                }

                await db.SaveChangesAsync();
                await LoadData();
                await Dlg.Success("Nhập dữ liệu thành công", $"Đã nạp thành công {importedCount} hồ sơ khách hàng mới vào hệ thống Supabase!");
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nhập dữ liệu", ex.Message);
        }
    }

    [RelayCommand]
    private async Task ExportCustomersAsync()
    {
        try
        {
            var dialog = new Microsoft.Win32.SaveFileDialog
            {
                Title = "Xuất dữ liệu Khách hàng ra tệp CSV",
                FileName = $"DanhSachKhachHang_{DateTime.Now:yyyyMMdd}.csv",
                Filter = "CSV File (*.csv)|*.csv"
            };

            if (dialog.ShowDialog() == true)
            {
                using var db = new AppDbContext();
                var list = await db.Customers.AsNoTracking().OrderBy(c => c.CifKh).ToListAsync();

                var sb = new System.Text.StringBuilder();
                sb.AppendLine("cif_kh,cif_khlq,full_name,marital_status,spouse_name,account_number,spouse_account_number");

                foreach (var c in list)
                {
                    sb.AppendLine($"\"{c.CifKh}\",\"{c.CifKhlq ?? ""}\",\"{c.FullName}\",\"{c.MaritalStatus}\",\"{c.SpouseName ?? ""}\",\"{c.AccountNumber ?? ""}\",\"{c.SpouseAccountNumber ?? ""}\"");
                }

                await System.IO.File.WriteAllTextAsync(dialog.FileName, sb.ToString(), System.Text.Encoding.UTF8);
                await Dlg.Success("Xuất dữ liệu thành công", $"Đã xuất {list.Count} hồ sơ khách hàng ra tệp '{dialog.FileName}'.");
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xuất dữ liệu", ex.Message);
        }
    }
}

public class CustomerImportDto
{
    public string? cif_kh { get; set; }
    public string? cif_khlq { get; set; }
    public string? full_name { get; set; }
    public string? marital_status { get; set; }
    public string? spouse_name { get; set; }
    public string? account_number { get; set; }
    public string? spouse_account_number { get; set; }
}