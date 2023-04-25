// TODO: move this later
const VIRTIO_NET_F_GUEST_CSUM =1
const VIRTIO_NET_F_CTRL_GUEST_OFFLOADS =2
const VIRTIO_NET_F_MAC =5
const VIRTIO_NET_F_GUEST_TSO4 =7
const VIRTIO_NET_F_GUEST_TSO6 =8
const VIRTIO_NET_F_GUEST_ECN =9
const VIRTIO_NET_F_GUEST_UFO =10
const VIRTIO_NET_F_HOST_TSO4 =11
const VIRTIO_NET_F_HOST_TSO6 =12
const VIRTIO_NET_F_HOST_ECN =13
const VIRTIO_NET_F_HOST_UFO =14
const VIRTIO_NET_F_MRG_RXBUF =15
const VIRTIO_NET_F_STATUS =16
const VIRTIO_NET_F_CTRL_VQ =17
const VIRTIO_NET_F_CTRL_RX =18
const VIRTIO_NET_F_CTRL_VLAN =19
const VIRTIO_NET_F_GUEST_ANNOUNCE=21


/**
 * @constructor
 *
 * @param {CPU} cpu
 * @param {BusConnector} bus
 */
function VirtioNet(cpu, bus) {
    /** @const @type {BusConnector} */
    this.bus = bus;
    this.test = "WORKS";
    console.log("√ in virtio net constructor");

    /** @type {VirtIO} */
    this.virtio = new VirtIO(cpu,
    {
        name: "virtio-net",
        pci_id: 0x05 << 3, // TODO: same as ne2k nic?
        device_id: 0x1041,
        subsystem_device_id: 1,
        common: 
        {
            initial_port: 0xA800,
            queues: 
            [
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
            ],
            features: 
            [
                VIRTIO_F_VERSION_1,
                VIRTIO_F_RING_EVENT_IDX,
                VIRTIO_F_RING_INDIRECT_DESC,
            ], // TODO: what features are needed?
            on_driver_ok: () => {},
        },
        notification:
        {
            initial_port: 0xA900,
            single_handler: false,
            handlers:
            [
                () => {console.log("√", "in virtio-net notification handler");},
            ],
        },
        isr_status:
        {
            initial_port: 0xA700,
        },
        device_specific:
        {
            initial_port: 0xA600,
            struct:
            [
                {
                    bytes: 2,
                    name: "mount tag length",
                    read: () => this.configspace_taglen,
                    write: data => { /* read only */ },
                },
            ].concat(v86util.range(VIRTIO_9P_MAX_TAGLEN).map(index =>
                ({
                    bytes: 1,
                    name: "mount tag name " + index,
                    // Note: configspace_tagname may have changed after set_state
                    read: () => this.configspace_tagname[index] || 0,
                    write: data => { /* read only */ },
                })
            )),
        },
    });
    this.recv_virtqueue = this.virtio.queues[0];
    this.send_virtqueue = this.virtio.queues[1];
}