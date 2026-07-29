using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CustomerManager.UI.Themes;
using Dlg = CustomerManager.UI.UI.Dialogs;
using System.Threading.Tasks;

namespace CustomerManager.ViewModels.Pages
{
    public partial class SettingsViewModel : ObservableObject
    {
        [ObservableProperty]
        private string _activeTheme = ThemeManager.CurrentTheme;

        [RelayCommand]
        private async Task SelectSlateDark()
        {
            ThemeManager.ApplyTheme("SlateDark");
            ActiveTheme = "SlateDark";
            await Dlg.Success("Giao diện hệ thống", "Đã chuyển sang giao diện 🌙 Slate Dark Mode (Tối Hiện Đại)!");
        }

        [RelayCommand]
        private async Task SelectEmeraldLight()
        {
            ThemeManager.ApplyTheme("EmeraldLight");
            ActiveTheme = "EmeraldLight";
            await Dlg.Success("Giao diện hệ thống", "Đã chuyển sang giao diện ☀️ Emerald Light Mode (Sáng Tối Giản)!");
        }

        [RelayCommand]
        private async Task SelectDeepIndigo()
        {
            ThemeManager.ApplyTheme("DeepIndigo");
            ActiveTheme = "DeepIndigo";
            await Dlg.Success("Giao diện hệ thống", "Đã chuyển sang giao diện 🍇 Deep Indigo Mode (Tím Hoàng Gia)!");
        }
    }
}
