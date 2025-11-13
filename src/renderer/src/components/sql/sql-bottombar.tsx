import React, { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { TableDataResult } from '@renderer/api/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface SqlBottombarProps {
  tableData?: TableDataResult
  limit: number
  offset: number
  onLimitChange: (limit: number) => void
  onOffsetChange: (offset: number) => void
}

export const SqlBottombar = ({
  tableData,
  limit,
  offset,
  onLimitChange,
  onOffsetChange
}: SqlBottombarProps) => {
  const totalRows = tableData?.totalCount ?? 0
  const executionTime = tableData?.executionTime ?? 0

  // Calculate page-based values
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalRows / limit) || 1
  const [pageInput, setPageInput] = useState(currentPage.toString())

  // Update page input when current page changes
  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  const handlePrev = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      onOffsetChange((newPage - 1) * limit)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      onOffsetChange((newPage - 1) * limit)
    }
  }

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageBlur = () => {
    const newPage = parseInt(pageInput, 10)
    if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
      onOffsetChange((newPage - 1) * limit)
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
        {/* Left side: Page navigation */}
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
            value={limit.toString()}
            onValueChange={(value) => onLimitChange(parseInt(value, 10))}
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

        {/* Right side: Rows per page, total records, execution time */}
        {tableData && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{totalRows} records</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{executionTime.toFixed(2)} ms</span>
          </div>
        )}
      </div>
    </div>
  )
}
