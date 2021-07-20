const EventBus = require('@vertx/eventbus-bridge-client.js')

/**
 * The update type.
 */
export enum UpdateType {
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

// /**
//  * The notification type.
//  */
// export enum NotificationType {
//   BROKEN = 'BROKEN',
//   BATTERY = 'BATTERY',
//   GEOFENCE = 'GEOFENCE',
// }

/**
 * The client options.
 */
export interface ClientOptions {
  /**
   * Ping interval.
   */
  pingInterval: number
  /**
   * Max reconnect attempts.
   */
  maxReconnectAttempts: number

  /**
   * Initial delay (in ms) before first reconnect attempt.
   */
  minReconnectDelay: number

  /**
   * Max delay (in ms) between reconnect attempts.
   */
  maxReconnectDelay: number

  /**
   * Exponential backoff factor.
   */
  reconnectExponentialBackoffFactor: number

  /**
   * Randomization factor between 0 and 1.
   */
  randomizationFactor: number
}

/**
 * An update callback.
 */
export type UpdateCallback = (
  /**
   * The type of the update received.
   */
  type: UpdateType,

  /**
   * The id of the item updated.
   */
  id: number,

  /**
   * The item updated (only for POST and PUT).
   */
  content?: Record<string, unknown>,

  /**
   * The error, if any.
   */
  error?: BusError,
) => void

// /**
//  * Notification callback.
//  */
// export type NotificationCallback = (
//   /**
//    * The type of the notification received
//    */
//   type: NotificationType,
//   /**
//    * The id of the item involved in the notification
//    */
//   id: number,
//   /**
//    * The error, if any.
//    */
//    error?: BusError,
// ) => void

interface UpdateMessage {
  type: UpdateType
  id: number
  content: Record<string, unknown>
}

interface BusMessage {
  type: string
  address: string
  headers: Record<string, unknown>
  body: UpdateMessage
}

/**
 * A bus error.
 */
export interface BusError {
  /**
   * The failure code.
   *
   */
  failureCode: number
  /**
   * The failure type.
   */
  failureType: string

  /**
   * The error message.
   */
  message: string
}

interface Bus {
  enableReconnect: (value: boolean) => void
  onopen: () => void
  registerHandler: (
    address: string,
    handler: (error: BusError, message: BusMessage) => void,
  ) => void
  close: () => void
}

/**
 * A client to communicate with the event bus.
 */
export class Client {
  private url: string
  private company: string
  private options?: ClientOptions
  private bus: Bus
  private onItemUpdateCallback?: UpdateCallback

  /**
   * @param url the url used to connect to the event bus
   * @param token the authentication token
   * @param company the client's company
   * @param options the client's options. Optional
   */
  constructor(url: string, token: string, company: string, options?: ClientOptions) {
    this.url = `${url}?token=${token}`
    this.company = company
    this.options = options
    this.onItemUpdateCallback = null
  }

  /**
   * Connects the client to the event bus.
   *
   * @return a Promise that completes when the connection is established
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const options = this.options && {
          vertxbus_ping_interval: this.options.pingInterval,
          vertxbus_reconnect_attempts_max: this.options.maxReconnectAttempts,
          vertxbus_reconnect_delay_min: this.options.minReconnectDelay,
          vertxbus_reconnect_delay_max: this.options.maxReconnectDelay,
          vertxbus_reconnect_exponent: this.options.reconnectExponentialBackoffFactor,
          vertxbus_randomization_factor: this.options.randomizationFactor,
        }
        this.bus = new EventBus(this.url, options)
        this.bus.enableReconnect(true)

        this.bus.onopen = () => {
          this.bus.registerHandler(
            `items.updates.${this.company}`,
            (error: BusError, message: BusMessage) => {
              const body = message.body
              if (this.onItemUpdateCallback) {
                this.onItemUpdateCallback(body.type, body.id, body.content, error)
              } else {
                console.error('No callback was registered for item update')
              }
            },
          )
          resolve()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnects the client.
   */
  disconnect() {
    if (this.bus) {
      this.bus.close()
    } else {
      console.error('The client is not connected')
    }
  }

  /**
   * Registers a callback to be called on item update.
   *
   * @param callback the callback to invoke
   */
  onItemUpdate(callback: UpdateCallback) {
    this.onItemUpdateCallback = callback
  }

  // onItemNotification(callback: NotificationCallback) {
  //   // TODO
  // }
}
