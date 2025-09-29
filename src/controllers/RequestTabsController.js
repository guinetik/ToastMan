import { ref, computed } from 'vue'
import { BaseController } from './BaseController.js'
import { Request, RequestBody, RequestAuth, RequestUrl, KeyValue, HTTP_METHODS, BODY_MODES } from '../models/Request.js'
import { Response, ResponseTiming, ResponseSize } from '../models/Response.js'
import { Tab } from '../models/Tab.js'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useTabs } from '../stores/useTabs.js'

/**
 * Controller for RequestTabs component
 */
export class RequestTabsController extends BaseController {
}