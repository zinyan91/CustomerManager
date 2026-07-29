using System.Windows;
using System.Windows.Controls;

namespace CustomerManager.UI.UI
{
    public partial class DialogShell : UserControl
    {
        public DialogShell()
        {
            InitializeComponent();
        }

        public string Title
        {
            get => (string)GetValue(TitleProperty);
            set => SetValue(TitleProperty, value);
        }
        public static readonly DependencyProperty TitleProperty =
            DependencyProperty.Register(nameof(Title), typeof(string), typeof(DialogShell), new PropertyMetadata(""));

        public string? Subtitle
        {
            get => (string?)GetValue(SubtitleProperty);
            set => SetValue(SubtitleProperty, value);
        }
        public static readonly DependencyProperty SubtitleProperty =
            DependencyProperty.Register(nameof(Subtitle), typeof(string), typeof(DialogShell), new PropertyMetadata(null));

        public object? MainContent
        {
            get => GetValue(MainContentProperty);
            set => SetValue(MainContentProperty, value);
        }
        public static readonly DependencyProperty MainContentProperty =
            DependencyProperty.Register(nameof(MainContent), typeof(object), typeof(DialogShell), new PropertyMetadata(null));

        public object? ToolbarContent
        {
            get => GetValue(ToolbarContentProperty);
            set => SetValue(ToolbarContentProperty, value);
        }
        public static readonly DependencyProperty ToolbarContentProperty =
            DependencyProperty.Register(nameof(ToolbarContent), typeof(object), typeof(DialogShell), new PropertyMetadata(null));

        public object? StatusContent
        {
            get => GetValue(StatusContentProperty);
            set => SetValue(StatusContentProperty, value);
        }
        public static readonly DependencyProperty StatusContentProperty =
            DependencyProperty.Register(nameof(StatusContent), typeof(object), typeof(DialogShell), new PropertyMetadata(null));

        public object? FooterRightContent
        {
            get => GetValue(FooterRightContentProperty);
            set => SetValue(FooterRightContentProperty, value);
        }
        public static readonly DependencyProperty FooterRightContentProperty =
            DependencyProperty.Register(nameof(FooterRightContent), typeof(object), typeof(DialogShell), new PropertyMetadata(null));
    }
}
