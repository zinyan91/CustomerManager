using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using CustomerManager.ViewModels.Pages;

namespace CustomerManager.Views.Pages;

public partial class CollateralView : UserControl
{
    public CollateralView()
    {
        InitializeComponent();
        IsVisibleChanged += CollateralView_IsVisibleChanged;
    }

    private void CollateralView_IsVisibleChanged(object sender, System.Windows.DependencyPropertyChangedEventArgs e)
    {
        if ((bool)e.NewValue && DataContext is CollateralViewModel vm)
        {
            _ = vm.LoadData();
        }
    }

    private void DataGrid_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        var dep = (DependencyObject)e.OriginalSource;
        while (dep != null && !(dep is DataGridRow))
        {
            dep = VisualTreeHelper.GetParent(dep);
        }

        if (dep is DataGridRow row && row.IsSelected)
        {
            if (DataContext is CollateralViewModel vm)
            {
                vm.ClearSelectionCommand.Execute(null);
                e.Handled = true;
            }
        }
    }
}
