using System.Configuration;
using System.Data;
using System.Windows;

namespace CustomerManager.UI
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Khởi tạo & vá đầy đủ cột CSDL Supabase trước khi mở màn hình chính
            CustomerManager.Data.AppDbContext.InitializeDatabase();

            var mainWindow = new MainWindow();
            mainWindow.DataContext = new CustomerManager.ViewModels.MainViewModel();
            mainWindow.Show();
        }
    }

}
