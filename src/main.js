import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { HttpClientFactory } from './core/http/HttpClient'
import { FetchHttpClient } from './core/http/FetchHttpClient'

HttpClientFactory.register('fetch', FetchHttpClient)
createApp(App).mount('#app')
