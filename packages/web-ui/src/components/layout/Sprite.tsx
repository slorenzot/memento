"use client";

export function ElefantsSprite({ props }: { props: string }) {
  return (
    <div
      className={`bg-[url('/sprite-elefants.png')] bg-size-[400%] h-[380px] w-[310px] rounded-2xl ${props}`}
    />
  );
}

export function Elefants2Sprite({ props }: { props: string }) {
  return (
    <div
      className={`bg-[url('/sprite-elefants-2.png')] bg-size-[500%] h-[380px] w-[310px]  rounded-2xl ${props}`}
    />
  );
}

export function SearchSprite() {
  return <ElefantsSprite props="bg-[position:-62px_-100px]" />;
}

export function SyncSprite() {
  return <ElefantsSprite props="bg-[position:-430px_-100px]" />;
}

export function ShareSprite() {
  return <ElefantsSprite props="bg-[position:-850px_-100px]" />;
}

export function WaitListSprite() {
  return <Elefants2Sprite props="bg-[position:-55px_-70px]" />;
}
