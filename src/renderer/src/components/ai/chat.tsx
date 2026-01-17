'use client'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from '@renderer/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@renderer/components/ai-elements/message'
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage
} from '@renderer/components/ai-elements/prompt-input'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { MessageSquare } from 'lucide-react'
import { FormEvent, useState } from 'react'

export const Chat = () => {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_AI_API_URL}/api/chat`,
      prepareSendMessagesRequest: ({ messages }) => {
        return {
          body: {
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.parts.map(p => p.type === 'text' ? p.text : '').join('')
            }))
          }
        }
      }
    })
  })

  const handleSubmit = async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.text.trim()) {
      return
    }

    sendMessage({ text: message.text })
    setInput('')
  }

  return (
    <div className="max-w-4xl mx-auto relative h-full w-full">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent className="gap-4">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquare className="size-4" />}
                title="Start a conversation"
                description="Type a message below to begin chatting with your database"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent className="text-base">
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <MessageResponse key={`${message.id}-${i}`}>
                              {part.text}
                            </MessageResponse>
                          )
                        default:
                          return null
                      }
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            value={input}
            placeholder="Ask about your database..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12 min-h-20"
          />
          <PromptInputSubmit
            status={status}
            disabled={status === 'streaming' || status === 'submitted' || !input.trim()}
            className="absolute bottom-2 right-2 size-6"
          />
        </PromptInput>
      </div>
    </div>
  )
}
