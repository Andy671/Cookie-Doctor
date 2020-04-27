import React from 'react'
import './Extension.css'
import deleteIcon from './delete.svg'

function Extension(props) {
  let riskText = ''
  let shouldRemove = true
  let color = 'red'
  if (props.risk >= 300) {
    riskText = '(Високий)'
  } else if (props.risk >= 100) {
    riskText = '(Середній)'
    color = 'orange'
  } else {
    riskText = '(Низький)'
    color = 'green'
    shouldRemove = false
  }
  const progress = (props.risk / 5)

  const deleteClasses = ['delete-button', color].join(' ')
  return (
    <div className='extension'>
      <div className='top-part'>
        <img src={props.image} alt='' />
        <div className='texts'>
          <p>{props.name}</p>
          <p>Ризик: <span className={color}>{props.risk.toString() + ' ' + riskText}</span></p>
        </div>
      </div>
      <div className='middle-part'>
        <div className='indicator'>
          <div style={{ width: progress + '%' }} className={color} />
        </div>
      </div>
      <div className='bottom-part'>
        {
          shouldRemove &&
          <div className={deleteClasses} onClick={() => props.onClick(props.id)}>
            <img src={deleteIcon} alt='' />
            <div>Видалити</div>
          </div>
        }
      </div>
      <hr />
    </div>
  )
}

export default Extension
