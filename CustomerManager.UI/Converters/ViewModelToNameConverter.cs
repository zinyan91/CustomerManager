using System;
using System.Globalization;
using System.Windows.Data;
using CustomerManager.ViewModels.Pages;

namespace CustomerManager.UI.Converters
{
    public class ViewModelToNameConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return value switch
            {
                OverviewViewModel => "Overview",
                CustomerListViewModel => "CustomerList",
                LoanPortfolioViewModel => "Loans",
                CollateralViewModel => "Collaterals",
                SettingsViewModel => "Settings",
                _ => string.Empty
            };
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return Binding.DoNothing;
        }
    }
}