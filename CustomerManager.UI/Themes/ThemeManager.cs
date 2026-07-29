using System;
using System.Windows;
using System.Windows.Media;

namespace CustomerManager.UI.Themes
{
    public static class ThemeManager
    {
        public static string CurrentTheme { get; private set; } = "SlateDark";

        public static void ApplyTheme(string themeName)
        {
            CurrentTheme = themeName;
            var res = Application.Current.Resources;

            switch (themeName)
            {
                case "EmeraldLight":
                    // THEME SÁNG EMERALD TƯƠNG PHẢN CAO SẮC NÉT
                    res["BgApp"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F8FAFC"));
                    res["Surface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["Surface2"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
                    res["BgCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["BdCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1"));

                    res["Primary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#059669"));
                    res["PrimaryHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#047857"));
                    res["OnPrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));

                    res["Success"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    res["Warning"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#D97706"));
                    res["Danger"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#DC2626"));

                    res["OnSurface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0F172A"));
                    res["OnSurfacePrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0F172A"));
                    res["OnSurfaceSecondary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                    res["OnSurfaceMuted"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#475569"));

                    res["InputBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["InputFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0F172A"));
                    res["InputBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));

                    res["BtnBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F1F5F9"));
                    res["BtnBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#059669"));
                    res["BtnBgHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));

                    res["SelectionBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#059669"));
                    res["SelectionFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    break;

                case "DeepIndigo":
                    // THEME TÍM HOÀNG GIA CAO CẤP
                    res["BgApp"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#090714"));
                    res["Surface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#120F26"));
                    res["Surface2"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#231F42"));
                    res["BgCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#16122F"));
                    res["BdCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#37306B"));

                    res["Primary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#818CF8"));
                    res["PrimaryHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#6366F1"));
                    res["OnPrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));

                    res["Success"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
                    res["Warning"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FBBF24"));
                    res["Danger"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F87171"));

                    res["OnSurface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["OnSurfacePrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["OnSurfaceSecondary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E0E7FF"));
                    res["OnSurfaceMuted"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#A5B4FC"));

                    res["InputBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0D0B1C"));
                    res["InputFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["InputBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#4C408E"));

                    res["BtnBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1D183C"));
                    res["BtnBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#818CF8"));
                    res["BtnBgHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#282347"));

                    res["SelectionBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#6366F1"));
                    res["SelectionFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    break;

                case "SlateDark":
                default:
                    // THEME TỐI SLATE BANKING SIÊU SẮC NÉT
                    res["BgApp"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#090D16"));
                    res["Surface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#111827"));
                    res["Surface2"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1F2937"));
                    res["BgCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#151E2E"));
                    res["BdCard"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#2A364F"));

                    res["Primary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#38BDF8"));
                    res["PrimaryHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"));
                    res["OnPrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));

                    res["Success"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
                    res["Warning"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FBBF24"));
                    res["Danger"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F87171"));

                    res["OnSurface"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["OnSurfacePrimary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["OnSurfaceSecondary"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1"));
                    res["OnSurfaceMuted"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));

                    res["InputBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0B0F17"));
                    res["InputFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    res["InputBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#334155"));

                    res["BtnBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                    res["BtnBorder"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#38BDF8"));
                    res["BtnBgHover"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#334155"));

                    res["SelectionBg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"));
                    res["SelectionFg"] = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                    break;
            }
        }
    }
}
