using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CustomerManager.Core.Models;
using CustomerManager.Data;
using Dlg = CustomerManager.UI.UI.Dialogs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace CustomerManager.ViewModels.Pages;

public partial class CreditCardViewModel : ObservableObject
{
    [ObservableProperty] private CreditCard? _selectedCard;
    [ObservableProperty] private Customer? _selectedCustomer;
    [ObservableProperty] private Collateral? _selectedCollateral;

    [ObservableProperty] private string _cardNumberInput = "";
    [ObservableProperty] private string _creditLimitInput = "0";
    [ObservableProperty] private int _cardTypeIndex = 0; // VISA Platinum, VISA Gold, Mastercard Platinum, JCB...
    [ObservableProperty] private int _issuanceTypeIndex = 1; // 0: STK, 1: Thế chấp TSĐB, 2: Lương, 3: CBNV
    [ObservableProperty] private double _interestRate = 18.0;

    [ObservableProperty] private int _totalSystemCardCount = 0;
    [ObservableProperty] private decimal _totalSystemCreditLimit = 0m;

    public bool IsCollateralRequired => IssuanceTypeIndex == 1 || IssuanceTypeIndex == 0; // Thế chấp TSĐB hoặc STK
    public bool IsCardSelected => SelectedCard != null;
    public string SubmitButtonText => SelectedCard == null ? "💳 PHÁT HÀNH THẺ TÍN DỤNG" : "✏️ CẬP NHẬT THẺ TÍN DỤNG";

    public ObservableCollection<CreditCard> CreditCards { get; } = new();
    public ObservableCollection<Customer> Customers { get; } = new();
    public ObservableCollection<Collateral> Collaterals { get; } = new();
    public ObservableCollection<Collateral> AvailableCollaterals { get; } = new();

    public ObservableCollection<string> CardTypeOptions { get; } = new()
    {
        "VISA Platinum",
        "VISA Gold",
        "Mastercard Platinum",
        "JCB Platinum"
    };

    public ObservableCollection<string> IssuanceTypeOptions { get; } = new()
    {
        "1. Cầm cố Sổ tiết kiệm / Giấy tờ có giá",
        "2. KH đang có Quan hệ tín dụng (Thế chấp TSĐB)",
        "3. Tín chấp theo Lương",
        "4. Tín chấp CBNV / Khác"
    };

    public CreditCardViewModel()
    {
        _ = LoadData();
    }

    public async Task LoadData()
    {
        try
        {
            AppDbContext.AwaitInitialization();
            using var db = new AppDbContext();

            var customerList = await db.Customers.AsNoTracking().OrderBy(c => c.FullName).ToListAsync();
            Customers.Clear();
            foreach (var c in customerList) Customers.Add(c);

            var collateralList = await db.Collaterals.Include(c => c.Customer).AsNoTracking().OrderByDescending(c => c.Id).ToListAsync();
            Collaterals.Clear();
            foreach (var col in collateralList) Collaterals.Add(col);

            await LoadCards();
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp dữ liệu thẻ", ex.Message);
        }
    }

    private async Task LoadCards(int? selectCardId = null)
    {
        try
        {
            AppDbContext.AwaitInitialization();
            using var db = new AppDbContext();
            var list = await db.CreditCards
                .Include(c => c.Customer)
                .Include(c => c.Collateral)
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            CreditCards.Clear();
            decimal totalLimit = 0m;
            foreach (var card in list)
            {
                CreditCards.Add(card);
                totalLimit += card.CreditLimit;
            }

            TotalSystemCardCount = CreditCards.Count;
            TotalSystemCreditLimit = totalLimit;

            if (selectCardId.HasValue && selectCardId.Value > 0)
            {
                SelectedCard = CreditCards.FirstOrDefault(c => c.Id == selectCardId.Value);
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi nạp danh sách Thẻ Tín Dụng", ex.Message);
        }
    }

    partial void OnIssuanceTypeIndexChanged(int value)
    {
        OnPropertyChanged(nameof(IsCollateralRequired));
    }

    partial void OnSelectedCustomerChanged(Customer? value)
    {
        RefreshAvailableCollaterals();
    }

    private void RefreshAvailableCollaterals()
    {
        AvailableCollaterals.Clear();
        if (SelectedCustomer == null) return;

        var userCols = Collaterals.Where(c => c.CustomerId == SelectedCustomer.Id).ToList();
        foreach (var col in userCols) AvailableCollaterals.Add(col);

        if (SelectedCollateral != null && SelectedCollateral.CustomerId != SelectedCustomer.Id)
        {
            SelectedCollateral = AvailableCollaterals.FirstOrDefault();
        }
        else if (SelectedCollateral == null)
        {
            SelectedCollateral = AvailableCollaterals.FirstOrDefault();
        }
    }

    partial void OnSelectedCardChanged(CreditCard? value)
    {
        OnPropertyChanged(nameof(IsCardSelected));
        OnPropertyChanged(nameof(SubmitButtonText));
        if (value != null)
        {
            CardNumberInput = value.CardNumber;
            CreditLimitInput = value.CreditLimit.ToString("N0");
            IssuanceTypeIndex = (int)value.IssuanceType;
            InterestRate = value.InterestRate;
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == value.CustomerId);
            SelectedCollateral = Collaterals.FirstOrDefault(c => c.Id == value.CollateralId);

            int typeIdx = CardTypeOptions.IndexOf(value.CardType);
            CardTypeIndex = typeIdx >= 0 ? typeIdx : 0;
        }
    }

    [RelayCommand]
    private void ClearForm()
    {
        SelectedCard = null;
        CardNumberInput = "";
        CreditLimitInput = "0";
        IssuanceTypeIndex = 1;
        InterestRate = 18.0;
        OnPropertyChanged(nameof(SubmitButtonText));
    }

    [RelayCommand]
    private async Task SaveOrUpdateCard()
    {
        if (SelectedCustomer == null)
        {
            await Dlg.Warning("Thiếu thông tin", "Vui lòng chọn Khách hàng phát hành thẻ!");
            return;
        }

        decimal limit = ParseDecimal(CreditLimitInput);
        if (limit <= 0)
        {
            await Dlg.Warning("Chưa nhập hạn mức", "Vui lòng nhập Hạn mức cấp thẻ hợp lệ (> 0 VNĐ)!");
            return;
        }

        if (IssuanceTypeIndex == 1 && SelectedCollateral == null)
        {
            await Dlg.Warning("Chưa chọn TSĐB", "Phát hành thẻ theo diện 'Quan hệ tín dụng (Thế chấp TSĐB)' bắt buộc phải chọn Tài sản bảo đảm!");
            return;
        }

        string cardNum = string.IsNullOrWhiteSpace(CardNumberInput)
            ? $"4123-8888-{Random.Shared.Next(1000, 9999)}-{Random.Shared.Next(1000, 9999)}"
            : CardNumberInput.Trim();

        string cardType = CardTypeOptions[Math.Clamp(CardTypeIndex, 0, CardTypeOptions.Count - 1)];

        try
        {
            using var db = new AppDbContext();

            if (SelectedCard != null)
            {
                // CẬP NHẬT THẺ TÍN DỤNG
                var card = await db.CreditCards.FindAsync(SelectedCard.Id);
                if (card != null)
                {
                    card.CardNumber = cardNum;
                    card.CardType = cardType;
                    card.CustomerId = SelectedCustomer.Id;
                    card.CreditLimit = limit;
                    card.IssuanceType = (CardIssuanceType)IssuanceTypeIndex;
                    card.CollateralId = IssuanceTypeIndex == 1 ? SelectedCollateral?.Id : null;
                    card.InterestRate = InterestRate;

                    db.CreditCards.Update(card);
                    await db.SaveChangesAsync();
                    await Dlg.Success("Cập nhật thành công", $"Đã cập nhật Thẻ Tín Dụng {card.CardNumber}!");
                }
            }
            else
            {
                // MỞ MỚI THẺ TÍN DỤNG
                var newCard = new CreditCard
                {
                    CardNumber = cardNum,
                    CardType = cardType,
                    CustomerId = SelectedCustomer.Id,
                    CreditLimit = limit,
                    IssuanceType = (CardIssuanceType)IssuanceTypeIndex,
                    CollateralId = IssuanceTypeIndex == 1 ? SelectedCollateral?.Id : null,
                    InterestRate = InterestRate,
                    IssueDate = DateTime.Today,
                    ExpiryDate = DateTime.Today.AddYears(3),
                    Status = "Hoạt động"
                };

                db.CreditCards.Add(newCard);
                await db.SaveChangesAsync();
                await Dlg.Success("Phát hành thành công", $"Đã mở thành công Thẻ Tín Dụng {newCard.CardType} - Hạn mức {limit:N0} VNĐ cho KH {SelectedCustomer.FullName}!");
            }

            ClearForm();
            await LoadCards();
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi lưu trữ thẻ", ex.Message);
        }
    }

    [RelayCommand]
    private async Task DeleteCard()
    {
        if (SelectedCard == null) return;

        bool confirm = await Dlg.Confirm("Xác nhận xoá thẻ", $"Bạn có chắc chắn muốn xoá Thẻ Tín Dụng {SelectedCard.CardNumber} (Hạn mức: {SelectedCard.CreditLimit:N0} VNĐ)?");
        if (!confirm) return;

        try
        {
            using var db = new AppDbContext();
            var card = await db.CreditCards.FindAsync(SelectedCard.Id);
            if (card != null)
            {
                db.CreditCards.Remove(card);
                await db.SaveChangesAsync();
                await Dlg.Success("Đã xoá", "Đã xoá Thẻ Tín Dụng thành công.");
                ClearForm();
                await LoadCards();
            }
        }
        catch (Exception ex)
        {
            await Dlg.Error("Lỗi xoá thẻ", ex.Message);
        }
    }

    partial void OnCreditLimitInputChanged(string value)
    {
        string digits = new string(value.Where(char.IsDigit).ToArray());
        if (decimal.TryParse(digits, out decimal val))
        {
            string formatted = string.Format("{0:N0}", val);
            if (formatted != value) _creditLimitInput = formatted;
        }
    }

    private static decimal ParseDecimal(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0m;
        string digits = new string(text.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, out decimal val) ? val : 0m;
    }
}
