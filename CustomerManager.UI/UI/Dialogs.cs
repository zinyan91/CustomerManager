using System;
using System.Threading.Tasks;
using System.Windows;

namespace CustomerManager.UI.UI
{
    public static class Dialogs
    {
        private static Window? ResolveOwner(Window? owner)
        {
            if (owner != null) return owner;

            foreach (Window w in Application.Current.Windows)
                if (w.IsActive) return w;

            return Application.Current.MainWindow;
        }

        private static Task<bool> ShowCoreAsync(string title, string message, Window? owner, bool showCancel)
        {
            bool result = false;

            Application.Current.Dispatcher.Invoke(() =>
            {
                var dlg = new ThemedDialogWindow
                {
                    Owner = ResolveOwner(owner),
                    TitleText = title,
                    MessageText = message,
                    OkText = "OK",
                    CancelText = "Hủy",
                    ShowCancel = showCancel ? Visibility.Visible : Visibility.Collapsed
                };

                var r = dlg.ShowDialog();
                result = r == true;
            });

            return Task.FromResult(result);
        }

        public static Task Info(string title, string message, Window? owner = null)
            => ShowCoreAsync(title, message, owner, false);

        public static Task Success(string title, string message, Window? owner = null)
            => ShowCoreAsync(title, message, owner, false);

        public static Task Error(string title, string message, Window? owner = null)
            => ShowCoreAsync(title, message, owner, false);

        public static Task Warning(string title, string message, Window? owner = null)
            => ShowCoreAsync(title, message, owner, false);

        public static Task<bool> Confirm(string title, string message, Window? owner = null)
            => ShowCoreAsync(title, message, owner, true);
    }
}
