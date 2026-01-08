import { useConnection } from '../api/queries/connections'

interface TitleProps {
  connectionId: string
}

export function Title({ connectionId }: TitleProps) {
  const { data: profile } = useConnection(connectionId)

  return <div>{profile?.name}</div>
}
