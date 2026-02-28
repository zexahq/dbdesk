import { QuickPanel } from './quick-panel'
import { UpdateNotification } from './update-notification'
import { UserMenu } from '@renderer/features/auth/components/user-menu'

export function MainSidebar() {
  return (
    <div className="bg-main-sidebar backdrop-blur py-2">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <QuickPanel />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <UpdateNotification />
          <UserMenu />
        </div>
      </div>
    </div>
  )
}
