using System;
using System.Globalization;
using System.Windows.Data;

namespace CustomerManager.UI.Converters
{
    public class BoolToCustomerDialogTitleConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
            => (value is bool b && b) ? "Sửa khách hàng" : "Thêm khách hàng";

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => Binding.DoNothing;
    }
}
