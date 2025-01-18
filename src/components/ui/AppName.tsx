import { Accessor, createEffect, createSignal, Match, Switch } from "solid-js";
import { Transition } from "solid-transition-group";

export default function AppName(props: { hide: Accessor<boolean> }) {
  const [connectionState, setConnectionState] = createSignal('online')
  const [showAppname, setShowAppname] = createSignal(true)

  const handleOnline = () => {
    setConnectionState('online')
    console.log('online');

    setTimeout(() => {
      setShowAppname(true)
    }, 2000);
  }
  const handleOffline = () => {
    console.log('offline');
    setConnectionState('offline')
    setShowAppname(false)
  }

  createEffect(() => {
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
  })

  return (
    <div class={`${props.hide() ? 'hidden' : ''} flex-1 ml-3 text-xl font-medium`}>
      < Transition name="slide-fade">
        <Switch>
          <Match when={connectionState() === 'online' && showAppname() === true}>
            <p class="dark:text-white">Nova</p>
          </Match>

          <Match when={connectionState() === 'online'}>
            <p class="text-pink-400 dark:text-white">متصل</p>
          </Match>
          <Match when={connectionState() === 'offline'}>
            <p class="text-pink-400 dark:text-white">غير متصل</p>
          </Match>
        </Switch>
      </Transition>
    </div >
  )
}
