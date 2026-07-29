using System;
using System.Globalization;
using System.Windows.Data;

namespace CustomerManager.UI.Converters
{
    public class NationalIdMaskConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is not string nationalId || string.IsNullOrWhiteSpace(nationalId))
                return "---";

            bool isMasked = parameter is bool b ? b : true;
            if (!isMasked || nationalId.Length < 6)
                return nationalId;

            int keepLength = Math.Min(6, nationalId.Length - 4);
            string firstPart = nationalId.Substring(0, keepLength);
            string lastPart = nationalId.Substring(nationalId.Length - 3);

            return $"{firstPart}***{lastPart}";
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
