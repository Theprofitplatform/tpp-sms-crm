import { useEffect, useState, useRef } from 'react'

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '',
  decimals = 0,
  className = ''
}) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const targetValue = parseFloat(value) || 0
    const startValue = countRef.current
    const startTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue + (targetValue - startValue) * easeOut
      
      setCount(currentValue)
      countRef.current = currentValue

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = count.toFixed(decimals)

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}
