using System.Windows.Controls;
using CustomerManager.ViewModels.Pages;

namespace CustomerManager.Views.Pages;

public partial class CreditCardView : UserControl
{
    public CreditCardView()
    {
        InitializeComponent();
        IsVisibleChanged += CreditCardView_IsVisibleChanged;
    }

    private void CreditCardView_IsVisibleChanged(object sender, System.Windows.DependencyPropertyChangedEventArgs e)
    {
        if ((bool)e.NewValue && DataContext is CreditCardViewModel vm)
        {
            _ = vm.LoadData();
        }
    }
}
