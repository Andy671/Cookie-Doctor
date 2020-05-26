/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react'
import './App.css'
import icon from './pill.svg'
import Extension from './Extension'
import axios from 'axios'
import { object } from 'prop-types'

const save = () => {
  try {
    chrome.storage.local.set({ 'test': '1234' }, function () {
      console.log('Success save test.')
    })
  } catch (err) {
    console.error(err)
  }
}

const load = () => {
  try {
    chrome.storage.local.get('test', function (result) {
      console.log('Success load test', result)
    })
  } catch (err) {
    console.error(err)
  }
}


let fetchExtensionListCallback = undefined

const fetchExtensionList = () => {
  try {
    chrome.management.getAll(async (extensions) => {
      const allExtensions = await getAllRiskScores(extensions)
      fetchExtensionListCallback(extensions)
    })

  } catch (err) {
    console.error(err)
  }
}

const calculateAppRiskScore = (extension) => {
  const PERMISSION_SCORES = {
    'activeTab': 12,
    'alarms': 0,
    'background': 12,
    'bookmarks': 20,
    'browsingData': 0,
    'certificateProvider': 12,
    'clipboardRead': 30,
    'clipboardWrite': 30,
    'contentSettings': 30,
    'contextMenus': 0,
    'cookies': 30,
    'debugger': 30,
    'declarativeContent': 0,
    'declarativeNetRequest': 30,
    'declarativeWebRequest': 30,
    'desktopCapture': 30,
    'displaySource': 30,
    'dns': 30,
    'documentScan': 30,
    'downloads': 24,
    'enterprise.deviceAttributes': 0,
    'enterprise.platformKeys': 12,
    'experimental': 30,
    'fileBrowserHandler': 0,
    'fileSystemProvider': 20,
    'fontSettings': 0,
    'gcm': 0,
    'geolocation': 20,
    'hid': 10,
    'history': 30,
    'identity': 12,
    'idle': 0,
    'idltest': 30,
    'management': 30,
    'mdns': 30,
    'nativeMessaging': 24,
    'networking.config': 6,
    'notifications': 6,
    'pageCapture': 30,
    'platformKeys': 6,
    'power': 0,
    'printerProvider': 30,
    'privacy': 30,
    'processes': 20,
    'proxy': 30,
    'sessions': 0,
    'signedInDevices': 20,
    'storage': 20,
    'system.cpu': 0,
    'system.display': 0,
    'system.memory': 0,
    'system.storage': 20,
    'tabCapture': 30,
    'tabs': 30,
    'topSites': 20,
    'tts': 0,
    'ttsEngine': 20,
    'unlimitedStorage': 0,
    'usbDevices': 12,
    'vpnProvider': 30,
    'wallpaper': 0,
    'webNavigation': 20,
    'webRequest': 30,
    'webRequestBlocking': 10,
    '<all_urls>': 30,
    'http://*/*': 30,
    'https://*/*': 30,
    '*://*/*': 30,
    'file:///*': 30,
    'http://*/': 30,
    'https://*/': 30,
    '*://*/': 30
  }
  let sum = 0
  for (let perm of extension.permissions) {
    if (Object.keys(PERMISSION_SCORES).includes(perm)) {
      sum += PERMISSION_SCORES[perm]
    }
  }

  return sum
}

const getAllRiskScores = async (extensions) => {
  const resultExtensions = await Promise.all(extensions.map((ext) => getChromeStorageData(ext)))

  for (let extension of resultExtensions) {
    if (typeof (extension.riskScore) === 'undefined') {
      console.log('undefined score, need to do the request')

      const cavatorScore = await getCavatorRequest(extension) / 10
      console.log('cavatorScore:', cavatorScore)

      const appScore = calculateAppRiskScore(extension)
      console.log('appScore:', appScore)

      extension.riskScore = Math.floor((Math.min(100, cavatorScore) + Math.min(100, appScore)) / 2)
      console.log('riskScore:', extension.riskScore)

      setChromeStorageData(`${extension.id}_${extension.version}`, extension.riskScore)
    } else {
      console.log('score defined, can do additional calculation')
    }
  }

  return resultExtensions
}

const getChromeStorageData = (ext) => {
  console.log('here', ext)
  return new Promise((resolve, reject) => {
    try {
      const key = `${ext.id}_${ext.version}`
      chrome.storage.local.get(key, function (result) {
        ext.riskScore = result[key]
        console.log(`${ext.id}:${ext.version}`, result[key])
        resolve(ext)
      })
    } catch (err) {
      console.error(err)
      reject(err)
    }
  })
}


const setChromeStorageData = (key, value) => {
  try {
    let obj = {}
    obj[key] = value
    chrome.storage.local.set(obj)
  } catch (err) {
    console.error(err)
  }
}

const getCavatorRequest = async (extension) => {
  const path = document.REQUEST_PATH
  try {
    const response = await axios.get(path, {
      headers: {
        'API-Key': document.API_KEY,
        'Target-URL': `https://api.crxcavator.io/v1/report/${extension.id}/${extension.version}`
      }
    })
    if (response.data === null) {
      return 250
    }
    return response.data.data.risk.total
  } catch (err) {
    console.error(err)
    return 250
  }
}

const onExtensionDelete = (id) => {
  try {
    chrome.management.uninstall(id, {}, function () {
      console.log('Uninstalled Callback')
      fetchExtensionList()
    })
  } catch (err) {
    console.error(err)
  }
}

const getExtensionIconUrl = (extension) => {
  let maxSize = 0
  try {
    let maxUrl = extension.icons[0].url
    if (extension.icons.length > 1) {
      for (let icon of extension.icons) {
        if (icon.size > maxSize) {
          maxUrl = icon.url
          maxSize = icon.size
        }
      }
    }
    return maxUrl
  } catch (err) {
    return ''
  }
}

function App() {
  const [extensionList, setExtensionList] = useState([])
  const [firstLaunch, setFirstLaunch] = useState(true)

  if (firstLaunch) {
    fetchExtensionListCallback = setExtensionList
    fetchExtensionList()
    // save()
    // setTimeout(() => {
    //   load()
    // }, 3000)
    setFirstLaunch(false)
  }

  let shortExtensionsData = []
  const inputData = extensionList
  for (let i = 0; i < inputData.length; i++) {
    if (inputData.name === 'Cookie Doctor')
      continue
    shortExtensionsData.push({
      id: inputData[i].id,
      shortName: inputData[i].shortName,
      riskScore: inputData[i].riskScore,
      image: getExtensionIconUrl(inputData[i]),
    })
  }
  shortExtensionsData.sort((a, b) => {
    return b.riskScore - a.riskScore
  })

  return (
    <div className='app'>
      <header className='app-header'>
        <img src={icon} className='app-logo' alt='logo' />
        <p className='app-name'>Cookie <span>Доктор</span></p>
      </header>
      <div className='content'>
        <div className='content-inner'>

          {shortExtensionsData.length > 0 ? shortExtensionsData.map(extension => {
            return <Extension
              key={extension.id}
              risk={extension.riskScore}
              name={extension.shortName}
              image={extension.image}
              id={extension.id}
              onClick={onExtensionDelete} />
          })
            : <div className='risks'>Підраховую Ризики..</div>}
        </div>
      </div>
    </div>
  )
}

export default App
