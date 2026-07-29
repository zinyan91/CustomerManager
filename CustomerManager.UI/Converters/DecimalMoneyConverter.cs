using System;
using System.Globalization;
using System.Windows.Data;

namespace CustomerManager.UI.Converters
{
    public class DecimalMoneyConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is decimal d)
                return d.ToString("N0", culture);

            return "";
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            var s = (value?.ToString() ?? "").Trim();
            if (string.IsNullOrWhiteSpace(s)) return 0m;

            s = s.Replace(",", "").Replace(".", "");

            return decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var d)
                ? d
                : 0m;
        }
    }
}
