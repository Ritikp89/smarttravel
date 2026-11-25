import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { MessageSquare, Plus, Send, Users } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import { groupChatApi } from '../../services/api'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

const displayName = (user) => user?.name || 'Traveler'

function Avatar({ user, size = 'sm' }) {
  const initials = displayName(user)
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-paper',
        size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
      )}
      style={{ backgroundColor: user?.avatarColor || '#c9532a' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

function Message({ message, own }) {
  return (
    <div className={clsx('flex items-end gap-2', own ? 'justify-end' : 'justify-start')}>
      {!own && <Avatar user={message.sender} />}
      <div className={clsx('max-w-[82%] sm:max-w-[70%]', own && 'text-right')}>
        {!own && <p className="mb-1 px-1 text-xs text-stone">{displayName(message.sender)}</p>}
        <p
          className={clsx(
            'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm',
            own ? 'rounded-br-md bg-ink text-paper' : 'rounded-bl-md border border-sand bg-white text-ink'
          )}
        >
          {message.content}
        </p>
        <time className="mt-1 block px-1 text-[10px] text-stone" dateTime={message.createdAt}>
          {format(new Date(message.createdAt), 'p')}
        </time>
      </div>
      {own && <Avatar user={message.sender} />}
    </div>
  )
}

export default function GroupChat() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedRoomId = searchParams.get('trip') || ''
  const [rooms, setRooms] = useState(null)
  const [roomsError, setRoomsError] = useState(null)
  const [roomsRefresh, setRoomsRefresh] = useState(0)
  const [messageState, setMessageState] = useState({ roomId: '', items: [], error: null })
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteNotice, setInviteNotice] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    let active = true
    groupChatApi
      .rooms()
      .then((availableRooms) => {
        if (!active) return
        setRooms(availableRooms)
        setRoomsError(null)
      })
      .catch((error) => {
        if (active) setRoomsError(error)
      })

    return () => {
      active = false
    }
  }, [roomsRefresh])

  const selectedRoomId = useMemo(() => {
    if (!rooms) return ''
    if (requestedRoomId && rooms.some((room) => room._id === requestedRoomId)) return requestedRoomId
    return rooms[0]?._id || ''
  }, [rooms, requestedRoomId])
  const messages = useMemo(
    () => (messageState.roomId === selectedRoomId ? messageState.items : []),
    [messageState, selectedRoomId]
  )
  const messagesError = messageState.roomId === selectedRoomId ? messageState.error : null

  const activeRoom = useMemo(
    () => rooms?.find((room) => room._id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  )

  useEffect(() => {
    if (!selectedRoomId) return undefined

    let active = true
    let loading = false
    const refresh = async () => {
      if (loading) return
      loading = true
      try {
        const latest = await groupChatApi.messages(selectedRoomId)
        if (active) {
          setMessageState((current) => {
            const unchanged =
              current.roomId === selectedRoomId &&
              current.error === null &&
              current.items.length === latest.length &&
              current.items.at(-1)?._id === latest.at(-1)?._id
            return unchanged ? current : { roomId: selectedRoomId, items: latest, error: null }
          })
        }
      } catch (error) {
        if (active) {
          setMessageState((current) => ({
            roomId: selectedRoomId,
            items: current.roomId === selectedRoomId ? current.items : [],
            error,
          }))
        }
      } finally {
        loading = false
      }
    }

    refresh()
    const timer = window.setInterval(refresh, 4000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [selectedRoomId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedRoomId])

  const selectRoom = (id) => {
    setSearchParams({ trip: id }, { replace: true })
  }

  const send = async (event) => {
    event.preventDefault()
    const content = messageText.trim()
    if (!content || sending || !selectedRoomId) return

    setSending(true)
    try {
      const saved = await groupChatApi.sendMessage(selectedRoomId, content)
      setMessageState((current) => {
        const currentMessages = current.roomId === selectedRoomId ? current.items : []
        return {
          roomId: selectedRoomId,
          items: currentMessages.some((message) => message._id === saved._id)
            ? currentMessages
            : [...currentMessages, saved],
          error: null,
        }
      })
      setMessageText('')
    } catch (error) {
      setMessageState({ roomId: selectedRoomId, items: messages, error })
    } finally {
      setSending(false)
    }
  }

  const invite = async (event) => {
    event.preventDefault()
    if (!inviteEmail.trim() || inviting || !activeRoom) return

    setInviting(true)
    setInviteError(null)
    setInviteNotice('')
    try {
      await groupChatApi.inviteMember(activeRoom._id, inviteEmail)
      setInviteEmail('')
      setInviteNotice('Traveler added to the group chat.')
      setRoomsRefresh((current) => current + 1)
    } catch (error) {
      setInviteError(error)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Travel together" title="Group chat">
        A separate space to coordinate with everyone on a trip.
      </PageHeader>

      {roomsError ? (
        <ErrorBox error={roomsError} onRetry={() => setRoomsRefresh((current) => current + 1)} />
      ) : !rooms ? (
        <Spinner label="Loading your group chats…" />
      ) : rooms.length === 0 ? (
        <Empty title="No group chats yet" illustration="💬" action={<Link to="/trips/new" className="btn-primary">Plan a trip</Link>}>
          Group chats are created for trips. Invite other travelers from a trip chat to get everyone talking.
        </Empty>
      ) : (
        <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-sand/70 bg-white/80 shadow-soft md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-sand/70 bg-cream/50 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-sand/70 px-4 py-4">
              <div>
                <h2 className="font-semibold">Your trip groups</h2>
                <p className="mt-0.5 text-xs text-stone">{rooms.length} {rooms.length === 1 ? 'conversation' : 'conversations'}</p>
              </div>
              <MessageSquare size={18} className="text-clay-600" />
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 md:block md:space-y-1 md:overflow-visible">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  type="button"
                  onClick={() => selectRoom(room._id)}
                  className={clsx(
                    'min-w-52 rounded-xl p-3 text-left transition md:w-full',
                    selectedRoomId === room._id ? 'bg-ink text-paper' : 'hover:bg-white'
                  )}
                >
                  <span className="block truncate text-sm font-semibold">{room.title || room.destination?.name || 'Trip chat'}</span>
                  <span className={clsx('mt-1 block truncate text-xs', selectedRoomId === room._id ? 'text-paper/70' : 'text-stone')}>
                    {room.destination?.name}{room.destination?.country ? `, ${room.destination.country}` : ''}
                  </span>
                  <span className={clsx('mt-2 flex items-center gap-1 text-[11px]', selectedRoomId === room._id ? 'text-paper/70' : 'text-stone')}>
                    <Users size={12} /> {(room.members?.length || 0) + 1} travelers
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {activeRoom ? (
            <div className="flex min-h-[620px] min-w-0 flex-col">
              <header className="border-b border-sand/70 px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{activeRoom.title || activeRoom.destination?.name || 'Trip chat'}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone">
                      <Users size={13} /> {activeRoom.owner?.name || 'Trip owner'} and {activeRoom.members?.length || 0} invited
                    </p>
                  </div>
                  {activeRoom.isOwner && (
                    <details className="group relative">
                      <summary className="btn-secondary !py-1.5 list-none [&::-webkit-details-marker]:hidden">
                        <Plus size={15} /> Invite
                      </summary>
                      <form onSubmit={invite} className="absolute right-0 z-10 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-sand bg-paper p-4 shadow-lift">
                        <label htmlFor="invite-email" className="label">Invite by account email</label>
                        <div className="flex gap-2">
                          <input
                            id="invite-email"
                            type="email"
                            className="input !py-2"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder="traveler@example.com"
                            required
                          />
                          <button type="submit" className="btn-primary !px-3" disabled={inviting}>
                            {inviting ? '…' : 'Add'}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-stone">They need an account to join this trip chat.</p>
                        {inviteError && <p className="mt-2 text-xs text-clay-700">{inviteError.message}</p>}
                        {inviteNotice && <p className="mt-2 text-xs text-moss-700">{inviteNotice}</p>}
                      </form>
                    </details>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[activeRoom.owner, ...(activeRoom.members || [])].map((member) => (
                    <span key={member._id} className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2 py-1 text-xs text-soot">
                      <Avatar user={member} />
                      {displayName(member)}
                    </span>
                  ))}
                </div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                {messagesError && <ErrorBox error={messagesError} />}
                {messages.length === 0 && !messagesError ? (
                  <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-cream text-clay-600"><MessageSquare size={20} /></span>
                    <h3 className="mt-3 font-semibold">Start the conversation</h3>
                    <p className="mt-1 text-sm text-stone">Share plans, questions, and updates with the group.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <Message key={message._id} message={message} own={String(message.sender?._id) === String(user?._id)} />
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="flex items-end gap-2 border-t border-sand/70 p-3 sm:p-4">
                <textarea
                  className="input min-h-11 max-h-32 resize-y !py-2.5"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      send(event)
                    }
                  }}
                  placeholder="Message the trip group…"
                  aria-label="Message the trip group"
                  maxLength={2000}
                  rows={1}
                />
                <button type="submit" className="btn-primary !h-11 !w-11 !shrink-0 !px-0" disabled={sending || !messageText.trim()} aria-label="Send message">
                  <Send size={16} />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[620px] items-center justify-center text-sm text-stone">Choose a trip group to open its chat.</div>
          )}
        </section>
      )}
    </div>
  )
}
