import { useConnection } from '@renderer/features/connections/queries/connections'

interface TitleProps {
  connectionId: string
}

export function Title({ connectionId }: TitleProps) {
  const { data: profile } = useConnection(connectionId)

  return <div>{profile?.name}</div>
}
