export default function DiscoveryLoading() {
  return <main className="discovery-loading" aria-label="Loading discovery"><div className="discovery-loading-title" /><div className="discovery-loading-filters" />{Array.from({ length: 3 }, (_, index) => <div className="discovery-loading-card" key={index} />)}</main>;
}
