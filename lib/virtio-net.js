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
        pci_id: 0x06 << 3, // TODO: same as 9p for now
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
                VIRTIO_F_VERSION_1
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
        }
    });
    this.recv_virtqueue = this.virtio.queues[0];
    this.send_virtqueue = this.virtio.queues[1];
}

VirtioNet.prototype.set_state = function(state) {
    console.log("√", state);
}