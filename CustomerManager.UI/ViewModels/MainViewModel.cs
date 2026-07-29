using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CustomerManager.ViewModels;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private object? _currentView;

    [ObservableProperty]
    private string _selectedNavTab = "CustomerList";

    private Pages.OverviewViewModel? _overviewVm;
    private Pages.CustomerListViewModel? _customerListVm;
    private Pages.LoanPortfolioViewModel? _loanVm;
    private Pages.CollateralViewModel? _collateralVm;
    private Pages.CreditCardViewModel? _creditCardVm;
    private Pages.SettingsViewModel? _settingsVm;

    public MainViewModel()
    {
        _customerListVm = new Pages.CustomerListViewModel();
        CurrentView = _customerListVm;
    }

    partial void OnSelectedNavTabChanged(string value)
    {
        switch (value)
        {
            case "Overview":
                _overviewVm ??= new Pages.OverviewViewModel();
                CurrentView = _overviewVm;
                _ = _overviewVm.LoadStatistics();
                break;

            case "CustomerList":
                _customerListVm ??= new Pages.CustomerListViewModel();
                CurrentView = _customerListVm;
                _ = _customerListVm.LoadData();
                break;

            case "Loans":
                _loanVm ??= new Pages.LoanPortfolioViewModel();
                CurrentView = _loanVm;
                _ = _loanVm.LoadData();
                break;

            case "Collaterals":
                _collateralVm ??= new Pages.CollateralViewModel();
                CurrentView = _collateralVm;
                _ = _collateralVm.LoadData();
                break;

            case "CreditCards":
                _creditCardVm ??= new Pages.CreditCardViewModel();
                CurrentView = _creditCardVm;
                _ = _creditCardVm.LoadData();
                break;

            case "Settings":
                _settingsVm ??= new Pages.SettingsViewModel();
                CurrentView = _settingsVm;
                break;
        }
    }

    [RelayCommand]
    private void Nav(string destination)
    {
        SelectedNavTab = destination;
    }
}