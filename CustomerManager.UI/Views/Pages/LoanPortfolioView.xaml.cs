using System.Windows.Controls;

namespace CustomerManager.Views.Pages
{
    public partial class LoanPortfolioView : UserControl
    {
        public LoanPortfolioView()
        {
            InitializeComponent();
            Loaded += (s, e) =>
            {
                if (DataContext is CustomerManager.ViewModels.Pages.LoanPortfolioViewModel vm)
                {
                    _ = vm.LoadData();
                }
            };
        }
    }
}
