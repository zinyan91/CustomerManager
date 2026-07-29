using System.Windows;

namespace CustomerManager.UI;

public partial class ThemedDialogWindow : Window
{
    public ThemedDialogWindow()
    {
        InitializeComponent();
        DataContext = this;
    }

    public string TitleText { get; set; } = "";
    public string MessageText { get; set; } = "";

    public string OkText { get; set; } = "OK";
    public string CancelText { get; set; } = "Hủy";

    public Visibility ShowCancel { get; set; } = Visibility.Collapsed;

    private void Ok_Click(object sender, RoutedEventArgs e) => DialogResult = true;
    private void Cancel_Click(object sender, RoutedEventArgs e) => DialogResult = false;
}
