# 📱 FormaOS Mobile Optimization Guide

## Overview
FormaOS has been fully optimized for mobile devices (375-430px width) while preserving ALL backend logic, scheduling → timelog sync, split-function behavior, cost code logic, and payment flows.

---

## 🎯 Mobile Breakpoint Strategy

### Breakpoint: `768px`
- **Below 768px**: Mobile-optimized layouts
- **768px and above**: Desktop layouts

### Implementation
Use the `useIsMobile()` hook throughout the app:
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();
```

---

## 🧭 Navigation

### Desktop Navigation
- Top horizontal nav bar with all main sections
- Full labels and icons

### Mobile Navigation
- **Bottom Tab Bar** with 5 tabs:
  1. Projects
  2. Workforce
  3. Schedule
  4. Costs
  5. More (Sheet with Dashboard, Admin)
  
- Touch-friendly 48px minimum hit areas
- Active state highlighting
- Labels use smaller font (10px) to fit better

**Location**: `src/components/MobileBottomNav.tsx`

---

## 📅 Schedule Views

### Monthly Calendar
- **Desktop**: 7-column grid with full day names
- **Mobile**: 7-column condensed grid
  - Single-letter day names (S, M, T, W, T, F, S)
  - Smaller padding and gaps
  - Touch-optimized day cells (min 80px height)
  - Reduced font sizes for chips and badges

### Weekly Schedule
- **Desktop**: 7-column grid showing full week
- **Mobile**: Single-column vertical stack
  - Swipeable day cards
  - Large touch targets for dates
  - Condensed schedule info
  - Hidden "+Add" on small screens, shown in header

### Daily Schedule
- **Desktop**: Full layout with all stats and controls
- **Mobile**:
  - Stats in 2x2 grid instead of 4 columns
  - Centered date navigation
  - Simplified action buttons
  - "Add" button text shortened

**Locations**: 
- `src/components/scheduling/MonthlyScheduleView.tsx`
- `src/components/scheduling/WeeklyScheduleView.tsx`
- `src/components/scheduling/DailyScheduleView.tsx`

---

## 📝 Time Logs

### Desktop
- Full table view with 8 columns
- Sortable headers
- Inline editing capabilities

### Mobile
- **Card-based layout** (`ViewLogsTabMobile`)
- Each log shown as a card with:
  - Worker name & trade badge
  - Project & client
  - Date & cost code
  - Hours prominently displayed in rounded badge
  - Notes (collapsed, 2-line clamp)
- Touch-friendly tap targets
- Active state on press

**Locations**:
- `src/components/dashboard/ViewLogsTab.tsx`
- `src/components/dashboard/ViewLogsTabMobile.tsx` (new)

---

## 🔧 Responsive Component Patterns

### 1. Conditional Rendering
```tsx
{isMobile ? (
  <MobileComponent />
) : (
  <DesktopComponent />
)}
```

### 2. Tailwind Responsive Classes
```tsx
className="text-xs sm:text-sm lg:text-base"
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
className="hidden sm:block"
className="sm:hidden"
```

### 3. Touch Target Sizing
- Minimum 44x44px (iOS) or 48x48px (Material)
- Implemented with `h-9 w-9 sm:h-10 sm:w-10` patterns

### 4. Icon Sizes
- Mobile: 16-20px (`h-4 w-4` or `h-5 w-5`)
- Desktop: 20-24px (`h-5 w-5` or `h-6 w-6`)

---

## 📊 Tables → Cards Pattern

### When to Convert
- Any table with 5+ columns on mobile becomes cards
- Examples: Time logs, worker lists, project lists, cost codes

### Card Structure
```tsx
<Card className="p-4 active:bg-accent cursor-pointer">
  <div className="space-y-3">
    {/* Primary info with icon */}
    <div className="flex items-center gap-2">
      <Icon />
      <span>Primary Data</span>
    </div>
    
    {/* Secondary info */}
    <div className="text-sm text-muted-foreground">
      Secondary Data
    </div>
    
    {/* Actions or status */}
    <div className="flex items-center justify-between">
      <Badge>Status</Badge>
      <Button size="sm">Action</Button>
    </div>
  </div>
</Card>
```

---

## 🎨 Spacing & Typography

### Mobile Spacing
- Card padding: `p-3` or `p-4` (desktop: `p-6`)
- Section gaps: `space-y-3` or `space-y-4` (desktop: `space-y-6`)
- Grid gaps: `gap-2` or `gap-3` (desktop: `gap-4`)

### Typography Scale
- Headings: `text-xl sm:text-2xl lg:text-3xl`
- Body: `text-sm sm:text-base`
- Small text: `text-xs sm:text-sm`
- Captions: `text-[10px] sm:text-xs`

---

## 🎭 Modal → Drawer Pattern

### Desktop
- Centered modals with backdrop
- Max width constraints
- Scroll inside modal

### Mobile
- Full-screen or bottom sheet drawers
- Rounded top corners (`rounded-t-3xl`)
- Slide-up animation
- Swipe-to-dismiss (when supported)

**Example**:
```tsx
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent side="bottom" className="h-auto rounded-t-3xl">
    {/* Content */}
  </SheetContent>
</Sheet>
```

---

## ✅ Mobile Checklist

### Visual
- [ ] No horizontal scrolling
- [ ] No clipped text or buttons
- [ ] Touch targets ≥ 44px
- [ ] Readable font sizes (≥ 12px)
- [ ] Proper contrast ratios

### Interaction
- [ ] Swipe gestures where appropriate
- [ ] Active states on touch
- [ ] No hover-only interactions
- [ ] Forms fit on screen without scrolling
- [ ] Keyboard doesn't obscure inputs

### Performance
- [ ] Fast load times on 3G
- [ ] Virtualized long lists
- [ ] Optimistic UI updates
- [ ] Minimal re-renders

---

## 🚫 What NOT to Change

The following logic remains **untouched**:
- ✅ Schedule → TimeLog auto-sync
- ✅ Split function behavior
- ✅ Cost code mappings
- ✅ Payment processing
- ✅ Estimate sync-to-budget
- ✅ All database triggers and RLS policies
- ✅ All Supabase queries and mutations

---

## 🧪 Testing Checklist

### Test Devices
- [ ] iPhone SE (375px) - smallest iOS device
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Android phones (360-400px)
- [ ] Tablet (768-1024px)

### Test Scenarios
1. **Schedule Flow**
   - [ ] View monthly calendar
   - [ ] View weekly calendar
   - [ ] View daily schedule
   - [ ] Add new schedule entry
   - [ ] Edit existing schedule
   - [ ] Split schedule across projects
   
2. **Time Logs**
   - [ ] View logs (card view)
   - [ ] Filter logs
   - [ ] Sort logs
   - [ ] View log details
   
3. **Navigation**
   - [ ] Switch between tabs
   - [ ] Open "More" menu
   - [ ] Navigate to all sections

---

## 📚 Key Files Modified

### Components
- `src/components/MobileBottomNav.tsx` - Bottom nav with Costs tab
- `src/components/dashboard/ViewLogsTabMobile.tsx` - NEW mobile card view
- `src/components/dashboard/ViewLogsTab.tsx` - Responsive wrapper
- `src/components/scheduling/DailyScheduleView.tsx` - Mobile-optimized
- `src/components/scheduling/WeeklyScheduleView.tsx` - Mobile-optimized
- `src/components/scheduling/MonthlyScheduleView.tsx` - Already responsive

### Pages
- `src/pages/Schedule.tsx` - Mobile-friendly tabs and layout

### Hooks
- `src/hooks/use-mobile.tsx` - Mobile detection utility

---

## 🎯 Future Mobile Enhancements

### Phase 2 (Optional)
- [ ] Pull-to-refresh on lists
- [ ] Swipe actions on cards (delete, edit)
- [ ] Bottom sheet date pickers
- [ ] Native share functionality
- [ ] Offline mode with sync
- [ ] Push notifications
- [ ] Biometric authentication

### Performance
- [ ] Image lazy loading
- [ ] Code splitting by route
- [ ] Service worker caching
- [ ] Intersection observer for infinite scroll

---

## 💡 Best Practices

1. **Always test on real devices** - Simulators don't show true performance
2. **Use semantic HTML** - Improves accessibility
3. **Progressive enhancement** - Mobile first, enhance for desktop
4. **Touch-first interactions** - Don't rely on hover states
5. **Minimize modal depth** - Keep navigation shallow on mobile
6. **Use native inputs** - Date pickers, selects, etc.
7. **Optimize images** - WebP format, proper sizing
8. **Test with slow network** - Throttle to 3G in DevTools

---

## 🐛 Common Mobile Issues & Fixes

### Issue: Text too small
**Fix**: Use responsive typography classes
```tsx
className="text-sm sm:text-base"
```

### Issue: Buttons too small
**Fix**: Increase touch target size
```tsx
className="h-11 w-11 sm:h-10 sm:w-10"  // Mobile gets BIGGER
```

### Issue: Table overflows
**Fix**: Convert to card stack on mobile
```tsx
{isMobile ? <CardStack /> : <Table />}
```

### Issue: Modal off-screen
**Fix**: Use Sheet with bottom positioning
```tsx
<SheetContent side="bottom" className="h-[90vh]">
```

---

## 📞 Support

For mobile-specific issues:
1. Check this guide first
2. Verify `useIsMobile()` hook is working
3. Test on actual devices, not just browser resize
4. Check console for responsive breakpoint logs

---

**Last Updated**: 2025-11-22  
**Version**: 1.3 Mobile Optimized
