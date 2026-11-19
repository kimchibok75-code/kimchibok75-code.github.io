// 치복 타운 PC 실행기 (2026-11-18)
// 크롬(없으면 엣지)을 "앱 창 모드"로 열어 게임만 창으로 띄움. 주소창·탭 없음
// 따로 쓰는 프로필 폴더(%LOCALAPPDATA%\ChibokTown)라서 브라우저와 섞이지 않고, 로그인은 이 창에서 한 번 하면 유지됨
// 만들기: windows-app\build.bat
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class Launcher {
  const string URL = "https://kimchibok.com/game.html?app=exe";   // ?app=exe → 게임이 Alt+Enter 전체화면을 켬

  [STAThread]
  static void Main() {
    string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
    string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
    string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
    string[] cands = {
      Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),     // 크롬 먼저 (엣지는 로그인·안내 창이 자꾸 떠서, 2026-11-18)
      Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
      Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
      Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
      Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
    };
    string exe = null;
    foreach (string c in cands) if (File.Exists(c)) { exe = c; break; }
    if (exe == null) {
      MessageBox.Show("엣지나 크롬 브라우저를 찾지 못했어요.\n브라우저를 설치한 뒤 다시 실행해 주세요.", "치복 타운", MessageBoxButtons.OK, MessageBoxIcon.Warning);
      return;
    }
    string profile = Path.Combine(local, exe.Contains("chrome") ? "ChibokTownChrome" : "ChibokTown");
    Directory.CreateDirectory(profile);
    // 화면 크기에 맞춘 창 크기 (화면의 85%, 최대 1600×960)
    var wa = Screen.PrimaryScreen.WorkingArea;
    int w = Math.Min(1600, (int)(wa.Width * .85)), h = Math.Min(960, (int)(wa.Height * .85));
    int x = wa.Left + (wa.Width - w) / 2, y = wa.Top + (wa.Height - h) / 2;
    string args = "--app=\"" + URL + "\" --user-data-dir=\"" + profile + "\" --window-size=" + w + "," + h + " --window-position=" + x + "," + y
      + " --no-first-run --no-default-browser-check --disable-features=msEdgeSidebarV2,msHubApps,msWelcomePage";
    try { Process.Start(new ProcessStartInfo(exe, args) { UseShellExecute = false }); }
    catch (Exception e) { MessageBox.Show("실행하지 못했어요: " + e.Message, "치복 타운", MessageBoxButtons.OK, MessageBoxIcon.Error); }
  }
}
