using CustomerManager.Core.Enums;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace CustomerManager.UI.Converters
{
    public class DeadlineSeverityToBrushConverter : IValueConverter
    {
        public Brush NoneBrush { get; set; } = Brushes.Transparent;
        public Brush LightBrush { get; set; } = Brushes.Transparent;
        public Brush MediumBrush { get; set; } = Brushes.Transparent;
        public Brush OverdueBrush { get; set; } = Brushes.Transparent;

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is not DeadlineSeverity s) return NoneBrush;

            return s switch
            {
                DeadlineSeverity.Overdue => OverdueBrush,
                DeadlineSeverity.Medium => MediumBrush,
                DeadlineSeverity.Light => LightBrush,
                _ => NoneBrush
            };
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => Binding.DoNothing;
    }
}
