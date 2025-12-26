'use client'

import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface QueryBottombarProps {
  totalRows: number
  executionTime?: number
  limit: number
  offset: number
  onLimitChange: (limit: number) => void
  onOffsetChange: (offset: number) => void
}

export const QueryBottombar = ({
  totalRows,
  executionTime,
  limit,
  offset,
  onLimitChange,
  onOffsetChange
}: QueryBottombarProps) => {
  const safeLimit = limit > 0 ? limit : 50
  const currentPage = Math.floor(offset / safeLimit) + 1
  const totalPages = Math.max(Math.ceil(totalRows / safeLimit) || 1, 1)
  const [pageInput, setPageInput] = useState(currentPage.toString())

  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  const handlePrev = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      onOffsetChange((newPage - 1) * safeLimit)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      onOffsetChange((newPage - 1) * safeLimit)
    }
  }

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageBlur = () => {
    const newPage = Number.parseInt(pageInput, 10)
    if (!Number.isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
      onOffsetChange((newPage - 1) * safeLimit)
    } else {
      setPageInput(currentPage.toString())
    }
  }

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageBlur()
    }
  }

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div className="border-t">
      <div className="flex items-center justify-between gap-4 p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={handlePrev}
            disabled={!canGoPrev}
          >
            <ArrowLeft className="size-3" />
            <span className="sr-only">Previous page</span>
          </Button>

          <span className="text-sm text-muted-foreground">Page</span>

          <Input
            value={pageInput}
            onChange={handlePageChange}
            onBlur={handlePageBlur}
            onKeyDown={handlePageKeyDown}
            className="w-12 text-center font-semibold"
            min={1}
            max={totalPages}
          />

          <span className="text-sm text-muted-foreground">of {totalPages}</span>

          <Button
            variant="outline"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            <ArrowRight className="size-3" />
            <span className="sr-only">Next page</span>
          </Button>

          <Select
            value={safeLimit.toString()}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalRows} records</span>
          {executionTime !== undefined && (
            <>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{executionTime.toFixed(2)} ms</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
