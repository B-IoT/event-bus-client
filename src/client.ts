import { jwtDecrypt } from 'jose/jwt/decrypt'
import { readFileSync } from 'fs'
const EventBus = require('@vertx/eventbus-bridge-client.js')

/**
 * Update type.
 */
export enum UpdateType {
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

// /**
//  * Notification type.
//  */
// export enum NotificationType {
//   BROKEN = 'BROKEN',
//   BATTERY = 'BATTERY',
//   GEOFENCE = 'GEOFENCE',
// }

/**
 * Client options.
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
 * Update callback.
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

/**
 * A client to communicate with the event bus.
 */
export class Client {
  private url: string
  private company: string
  private options?: ClientOptions
  private bus: any
  private onItemUpdateCallback: UpdateCallback

  private constructor(url: string, company: string, options: ClientOptions) {
    this.url = url
    this.company = company
    this.options = options
  }

  /**
   * Factory method to create the client.
   *
   * @param url the url used to connect to the event bus
   * @param token the authentication token
   * @param options the client options
   * @return a Promise that completes with a new instance of the client
   */
  static async create(url: string, token: string, options?: ClientOptions) {
    const privateKey = readFileSync('./.private.key', 'utf8')
    const { payload } = await jwtDecrypt(token, new TextEncoder().encode(privateKey), {
      issuer: 'BioT',
    })
    const company = payload.company as string
    return new Client(`${url}?token=${token}`, company, options)
  }

  /**
   * Connects the client to the event bus.
   *
   * @return a Promise that completes when the connection is established
   */
  async connect(): Promise<void> {
    return new Promise((resolve) => {
      const options = this.options && {
        vertxbus_ping_interval: this.options.pingInterval,
        vertxbus_reconnect_attempts_max: this.options.maxReconnectAttempts,
        vertxbus_reconnect_delay_min: this.options.minReconnectDelay,
        vertxbus_reconnect_delay_max: this.options.maxReconnectDelay,
        vertxbus_reconnect_exponent: this.options.reconnectExponentialBackoffFactor,
        vertxbus_randomization_factor: this.options.randomizationFactor,
      }
      const bus = new EventBus(this.url, options)
      bus.enableReconnect(true)

      bus.onopen = () => {
        resolve()

        bus.registerHandler(
          `items.updates.${this.company}`,
          (error: BusError, message: BusMessage) => {
            const body = message.body
            this.onItemUpdateCallback &&
              this.onItemUpdateCallback(body.type, body.id, body.content, error)
          },
        )
      }
    })
  }

  /**
   * Disconnects the client.
   */
  disconnect() {
    this.bus.close()
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
