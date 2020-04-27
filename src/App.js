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
    'activeTab': 47,
    'alarms': 0,
    'background': 58,
    'bookmarks': 97,
    'browsingData': 0,
    'certificateProvider': 48,
    'clipboardRead': 155,
    'clipboardWrite': 155,
    'contentSettings': 148,
    'contextMenus': 0,
    'cookies': 220,
    'debugger': 215,
    'declarativeContent': 0,
    'declarativeNetRequest': 160,
    'declarativeWebRequest': 160,
    'desktopCapture': 155,
    'displaySource': 155,
    'dns': 155,
    'documentScan': 45,
    'downloads': 110,
    'enterprise.deviceAttributes': 0,
    'enterprise.platformKeys': 47,
    'experimental': 152,
    'fileBrowserHandler': 0,
    'fileSystemProvider': 95,
    'fontSettings': 0,
    'gcm': 0,
    'geolocation': 95,
    'hid': 45,
    'history': 165,
    'identity': 65,
    'idle': 0,
    'idltest': 145,
    'management': 145,
    'mdns': 145,
    'nativeMessaging': 120,
    'networking.config': 45,
    'notifications': 45,
    'pageCapture': 175,
    'platformKeys': 45,
    'power': 0,
    'printerProvider': 45,
    'privacy': 150,
    'processes': 100,
    'proxy': 150,
    'sessions': 0,
    'signedInDevices': 100,
    'storage': 100,
    'system.cpu': 0,
    'system.display': 0,
    'system.memory': 0,
    'system.storage': 100,
    'tabCapture': 140,
    'tabs': 145,
    'topSites': 95,
    'tts': 0,
    'ttsEngine': 95,
    'unlimitedStorage': 0,
    'usbDevices': 45,
    'vpnProvider': 145,
    'wallpaper': 0,
    'webNavigation': 95,
    'webRequest': 195,
    'webRequestBlocking': 45,
    '<all_urls>': 210,
    'http://*/*': 145,
    'https://*/*': 145,
    '*://*/*': 195,
    'file:///*': 145,
    'http://*/': 145,
    'https://*/': 145,
    '*://*/': 190
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

      const cavatorScore = await getCavatorRequest(extension)
      console.log('cavatorScore:', cavatorScore)

      const appScore = calculateAppRiskScore(extension)
      console.log('appScore:', appScore)

      extension.riskScore = Math.floor((Math.min(1000, cavatorScore) / 2 + Math.min(1000, appScore) / 2) / 2)
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
