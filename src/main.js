import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { HttpClientFactory } from './core/http/HttpClient'
import { FetchHttpClient } from './core/http/FetchHttpClient'
import { initializeAnalytics } from './composables/useAnalytics.js'

HttpClientFactory.register('fetch', FetchHttpClient)
initializeAnalytics()
createApp(App).mount('#app')
