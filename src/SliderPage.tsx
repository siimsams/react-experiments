import RecycledList from "./recycled-list";

interface MyDataItem {
  title: string;
}

export default function SliderPage() {
  const items: MyDataItem[] = Array.from({ length: 1000 }, (_, i) => ({
    title: `Item ${i}`,
  }));

  return (
    <div className="h-screen border border-gray-300">
      <RecycledList
        data={items}
        visibleCount={7}
        overscan={3}
        direction="x"
        renderItem={(item) => (
          <div style={{ height: "100%", width: "calc(100vw / 7)", border: "1px solid red"}}>
            {item.title}
          </div>
        )}
      />
    </div>
  );
}