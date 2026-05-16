import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  MessagesSquare,
  UserPlus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import FlowaLogo from './FlowaLogo';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import { UserAvatar } from './UserAvatar';
import { authApi } from '../utils/api';

const navItems = [
<<<<<<< HEAD
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/team', icon: UserPlus, label: 'Team' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/inbox', icon: MessagesSquare, label: 'Inbox' },
  { to: '/settings', icon: Settings, label: 'Settings' },
=======
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/marketplace', icon: Store,           label: 'Marketplace' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
>>>>>>> 9f657bef8610d1492ce935b2b1c9a049f2807d7c
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const { user, token, logout } = useStore();

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi.notifications()
      .then((res) => {
        if (!active) return;
        setUnreadNotifications(Number(res.data.unreadCount || 0));
      })
      .catch(() => {
        if (!active) return;
        setUnreadNotifications(0);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col border-r border-surface-border bg-surface-card transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[220px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-surface-border">
          <FlowaLogo size={32} className="min-w-[32px]" />
          {!collapsed && (
            <span className="font-body text-lg font-bold tracking-tight text-foreground truncate">
              Flowa
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                }`
              }
            >
              <div className="relative min-w-[18px]">
                <item.icon size={18} className="min-w-[18px]" />
                {item.to === '/notifications' && unreadNotifications > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section: user + collapse + logout */}
        <div className="border-t border-surface-border px-2 py-3 space-y-1">
          {/* User info */}
          {user && (
            <div
              className="relative"
              onMouseEnter={() => setShowProfileCard(true)}
              onMouseLeave={() => setShowProfileCard(false)}
            >
              <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-surface-hover/80">
                <UserAvatar
                  avatar={user.avatar}
                  name={user.name || 'User'}
                  size={collapsed ? 36 : 38}
                  glow
                  animatedBorder
                  presence="online"
                />
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-foreground-muted truncate">{user.headline || user.email}</p>
                  </div>
                )}
              </div>

              {showProfileCard && (
                <div className={`absolute bottom-full mb-3 z-30 w-64 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.95))] p-4 shadow-2xl backdrop-blur-xl ${collapsed ? 'left-0' : 'left-2'}`}>
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      avatar={user.avatar}
                      name={user.name || 'User'}
                      size={52}
                      glow
                      animatedBorder
                      presence="online"
                      showRing
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                        <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                          Online
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-foreground-muted">{user.headline || 'Building workflows and collaborating live.'}</p>
                      <p className="mt-2 truncate text-xs text-foreground-secondary">{user.email}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground-muted">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{user.role || 'Member'}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Presence active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
          >
            <LogOut size={18} className="min-w-[18px]" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200 w-full"
          >
            {collapsed ? (
              <ChevronRight size={18} className="min-w-[18px]" />
            ) : (
              <>
                <ChevronLeft size={18} className="min-w-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
